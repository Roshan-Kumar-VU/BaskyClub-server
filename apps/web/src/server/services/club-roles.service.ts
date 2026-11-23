// Club staff roles with history (#14, #15, #44): owner, admin, captain.
// A role row is "current" while to_at is empty. Ending a role fills to_at; the row stays as history.
// Who can do what:
//   admin   — given/taken by the owner (or the Basky team); an admin can step down
//   captain — given/taken by the owner or an admin; a captain can step down
//   owner   — only changes hands through "transfer ownership"
import { z } from "zod";
import { prisma } from "../db";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { uuid } from "../http";
import { requireActive, type Viewer } from "../auth/viewer";
import { ageOn } from "../lib/dates";
import { getClubPowers, isBaskyTeam, logChange } from "../permissions";

export const grantRoleInput = z.object({
  userId: uuid,
  role: z.enum(["admin", "captain"]),
});

export const transferOwnershipInput = z.object({
  newOwnerUserId: uuid,
  /** Keep the old owner on as an admin (default yes). */
  keepAsAdmin: z.boolean().default(true),
});

async function requireActiveMember(clubId: string, userId: string) {
  const m = await prisma.clubMembership.findFirst({ where: { clubId, userId, status: "active" } });
  if (!m) throw badRequest("not_a_member", "This person must be an active member of the club first.");
  return m;
}

export async function grantRole(viewer: Viewer, clubId: string, input: z.infer<typeof grantRoleInput>) {
  requireActive(viewer);
  const club = await prisma.club.findFirst({ where: { id: clubId, deletedAt: null } });
  if (!club) throw notFound("Club");
  const powers = await getClubPowers(viewer, clubId);
  const basky = isBaskyTeam(viewer);

  if (input.role === "admin" && !powers.isOwner && !basky) {
    throw forbidden("owner_only", "Only the club owner can make someone an admin.");
  }
  if (input.role === "captain" && !powers.canManage) {
    throw forbidden("club_staff_only", "Only the club's owner or admins can choose a captain.");
  }
  await requireActiveMember(clubId, input.userId);

  const already = await prisma.clubRole.findFirst({
    where: { clubId, userId: input.userId, role: input.role, toAt: null },
  });
  if (already) throw conflict("already_has_role", `This person is already ${input.role}.`);

  const row = await prisma.$transaction(async (tx) => {
    const created = await tx.clubRole.create({
      data: { clubId, userId: input.userId, role: input.role, grantedById: viewer.id },
    });
    await logChange(tx, viewer.id, "club_roles", created.id, "create", null, { userId: input.userId, role: input.role });
    return created;
  });
  return { id: row.id, role: row.role };
}

export async function endRole(viewer: Viewer, clubRoleId: string) {
  const row = await prisma.clubRole.findUnique({ where: { id: clubRoleId } });
  if (!row || row.toAt) throw notFound("Role");
  if (row.role === "owner") {
    throw badRequest("use_transfer", "The owner role changes hands with Transfer ownership.");
  }

  const powers = await getClubPowers(viewer, row.clubId);
  const isSelf = row.userId === viewer.id;
  const allowed =
    isSelf ||
    isBaskyTeam(viewer) ||
    (row.role === "admin" && powers.isOwner) ||
    (row.role === "captain" && powers.isStaff);
  if (!allowed) throw forbidden("not_allowed", "You cannot change this person's role.");

  await prisma.$transaction(async (tx) => {
    await tx.clubRole.update({ where: { id: row.id }, data: { toAt: new Date() } });
    await logChange(tx, viewer.id, "club_roles", row.id, "update", { toAt: null }, { toAt: "now" });
  });
  return { ok: true };
}

export async function transferOwnership(viewer: Viewer, clubId: string, input: z.infer<typeof transferOwnershipInput>) {
  requireActive(viewer);
  const owner = await prisma.clubRole.findFirst({ where: { clubId, role: "owner", toAt: null } });
  if (!owner) throw notFound("Club owner");
  if (owner.userId !== viewer.id && !isBaskyTeam(viewer)) {
    throw forbidden("owner_only", "Only the club owner can hand the club over.");
  }
  if (input.newOwnerUserId === owner.userId) throw badRequest("same_owner", "This person already owns the club.");

  await requireActiveMember(clubId, input.newOwnerUserId);
  const newOwner = await prisma.user.findUniqueOrThrow({ where: { id: input.newOwnerUserId } });
  if (newOwner.status !== "active" || ageOn(newOwner.dateOfBirth) < 18) {
    throw badRequest("adult_required", "The new owner must be an active account aged 18 or over.");
  }

  const now = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.clubRole.update({ where: { id: owner.id }, data: { toAt: now } });
    // The new owner's admin role (if any) is replaced by ownership
    await tx.clubRole.updateMany({
      where: { clubId, userId: newOwner.id, role: "admin", toAt: null },
      data: { toAt: now },
    });
    await tx.clubRole.create({ data: { clubId, userId: newOwner.id, role: "owner", grantedById: viewer.id, fromAt: now } });
    if (input.keepAsAdmin) {
      const oldOwnerStillMember = await tx.clubMembership.findFirst({
        where: { clubId, userId: owner.userId, status: "active" },
      });
      if (oldOwnerStillMember) {
        await tx.clubRole.create({ data: { clubId, userId: owner.userId, role: "admin", grantedById: viewer.id, fromAt: now } });
      }
    }
    await logChange(tx, viewer.id, "clubs", clubId, "update", { owner: owner.userId }, { owner: newOwner.id });
  });
  return { ok: true, ownerUserId: newOwner.id };
}
