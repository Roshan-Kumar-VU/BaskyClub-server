// Joining and leaving clubs (#17, #63).
// One row per stint: join → "pending"; accepted → "active"; then "left" / "removed",
// or "rejected". Rejoining adds a new row, so history is kept. The database allows only
// one pending/active row per person per club (index club_memberships_one_open).
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { paging } from "../http";
import { requireActive, type Viewer } from "../auth/viewer";
import { getClubPowers, isBaskyTeam, logChange, requireClubManager } from "../permissions";
import { POSITIONS } from "./clubs.service";

export const joinInput = z.object({
  isPlayer: z.boolean().default(true),
  primaryPosition: z.enum(POSITIONS).optional(),
});

export const updateMemberInput = z
  .object({
    isPlayer: z.boolean(),
    primaryPosition: z.enum(POSITIONS).nullable(),
    // Only club staff can set these two
    isCoach: z.boolean(),
    isReferee: z.boolean(),
  })
  .partial();

export const listMembersQuery = z.object({ ...paging });

type Tx = Prisma.TransactionClient;

/** Ends any admin/captain role the person still holds in the club (used when they leave or are removed). */
function endClubRoles(tx: Tx, clubId: string, userId: string) {
  return tx.clubRole.updateMany({
    where: { clubId, userId, toAt: null, role: { in: ["admin", "captain"] } },
    data: { toAt: new Date() },
  });
}

async function isCurrentOwner(clubId: string, userId: string, db: Tx | typeof prisma = prisma) {
  return !!(await db.clubRole.findFirst({ where: { clubId, userId, role: "owner", toAt: null } }));
}

// ---- Ask to join --------------------------------------------------------------

export async function requestToJoin(viewer: Viewer, clubId: string, input: z.infer<typeof joinInput>) {
  requireActive(viewer);
  const club = await prisma.club.findFirst({ where: { id: clubId, deletedAt: null, status: "approved" } });
  if (!club) throw notFound("Club");

  const open = await prisma.clubMembership.findFirst({
    where: { clubId, userId: viewer.id, status: { in: ["pending", "active"] } },
  });
  if (open?.status === "active") throw conflict("already_member", "You are already a member of this club.");
  if (open?.status === "pending") throw conflict("already_requested", "Your request to join is waiting for the club.");

  const row = await prisma.clubMembership.create({
    data: {
      clubId,
      userId: viewer.id,
      status: "pending",
      isPlayer: input.isPlayer,
      primaryPosition: input.isPlayer ? input.primaryPosition : null,
    },
  });
  return { id: row.id, status: row.status };
}

/** Withdraw your own pending request. */
export async function cancelRequest(viewer: Viewer, clubId: string) {
  const row = await prisma.clubMembership.findFirst({ where: { clubId, userId: viewer.id, status: "pending" } });
  if (!row) throw notFound("Join request");
  await prisma.clubMembership.update({ where: { id: row.id }, data: { status: "left", leftAt: new Date() } });
  return { ok: true };
}

// ---- Club staff: requests --------------------------------------------------------

export async function listJoinRequests(viewer: Viewer, clubId: string) {
  await requireClubManager(viewer, clubId);
  const rows = await prisma.clubMembership.findMany({
    where: { clubId, status: "pending" },
    select: {
      id: true,
      isPlayer: true,
      primaryPosition: true,
      requestedAt: true,
      user: { select: { id: true, name: true, photoUrl: true, homeDistrictCode: true } },
    },
    orderBy: { requestedAt: "asc" },
  });
  return { requests: rows };
}

export async function decideRequest(viewer: Viewer, membershipId: string, decision: "approve" | "reject") {
  const row = await prisma.clubMembership.findUnique({ where: { id: membershipId } });
  if (!row) throw notFound("Join request");
  await requireClubManager(viewer, row.clubId);
  if (row.status !== "pending") throw badRequest("not_pending", "This request has already been handled.");

  const updated = await prisma.clubMembership.update({
    where: { id: row.id },
    data:
      decision === "approve"
        ? { status: "active", joinedAt: new Date(), approvedById: viewer.id }
        : { status: "rejected", approvedById: viewer.id },
  });
  return { id: updated.id, status: updated.status };
}

// ---- Leave / remove ------------------------------------------------------------------

export async function leaveClub(viewer: Viewer, clubId: string) {
  const row = await prisma.clubMembership.findFirst({ where: { clubId, userId: viewer.id, status: "active" } });
  if (!row) throw notFound("Membership");
  if (await isCurrentOwner(clubId, viewer.id)) {
    throw conflict("owner_cannot_leave", "Hand the club over to another member before leaving.");
  }
  await prisma.$transaction(async (tx) => {
    await tx.clubMembership.update({ where: { id: row.id }, data: { status: "left", leftAt: new Date() } });
    await endClubRoles(tx, clubId, viewer.id);
  });
  return { ok: true };
}

export async function removeMember(viewer: Viewer, membershipId: string) {
  const row = await prisma.clubMembership.findUnique({ where: { id: membershipId } });
  if (!row || row.status !== "active") throw notFound("Member");
  const powers = await requireClubManager(viewer, row.clubId);

  if (row.userId === viewer.id) throw badRequest("use_leave", "To leave the club yourself, use Leave club.");
  if (await isCurrentOwner(row.clubId, row.userId)) throw forbidden("cannot_remove_owner", "The club owner cannot be removed.");
  const targetIsAdmin = !!(await prisma.clubRole.findFirst({
    where: { clubId: row.clubId, userId: row.userId, role: "admin", toAt: null },
  }));
  if (targetIsAdmin && !powers.isOwner && !isBaskyTeam(viewer)) {
    throw forbidden("owner_only", "Only the club owner can remove an admin.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.clubMembership.update({ where: { id: row.id }, data: { status: "removed", leftAt: new Date() } });
    await endClubRoles(tx, row.clubId, row.userId);
    await logChange(tx, viewer.id, "club_memberships", row.id, "update", { status: "active" }, { status: "removed" });
  });
  return { ok: true };
}

// ---- Member details (player ticked + position) ------------------------------------------

export async function updateMember(viewer: Viewer, membershipId: string, input: z.infer<typeof updateMemberInput>) {
  const row = await prisma.clubMembership.findUnique({ where: { id: membershipId } });
  if (!row || row.status !== "active") throw notFound("Member");

  const isSelf = row.userId === viewer.id;
  const powers = await getClubPowers(viewer, row.clubId);
  if (!isSelf && !powers.canManage) throw forbidden("club_staff_only", "Only the club's owner or admins can do this.");
  if ((input.isCoach !== undefined || input.isReferee !== undefined) && !powers.canManage) {
    throw forbidden("club_staff_only", "Only club staff can mark someone as coach or referee.");
  }

  const isPlayer = input.isPlayer ?? row.isPlayer;
  const updated = await prisma.clubMembership.update({
    where: { id: row.id },
    data: {
      ...input,
      // A position only makes sense for players
      primaryPosition: isPlayer ? (input.primaryPosition !== undefined ? input.primaryPosition : row.primaryPosition) : null,
    },
    select: { id: true, isPlayer: true, isCoach: true, isReferee: true, primaryPosition: true },
  });
  return updated;
}

// ---- Members list (public club page) ---------------------------------------------------------

export async function listMembers(clubId: string, viewer: Viewer | null, query: z.infer<typeof listMembersQuery>) {
  const club = await prisma.club.findFirst({ where: { id: clubId, deletedAt: null } });
  if (!club) throw notFound("Club");
  if (club.status !== "approved" && !(await getClubPowers(viewer, clubId)).canManage) throw notFound("Club");

  const where = { clubId, status: "active" };
  const [rows, total, roles] = await Promise.all([
    prisma.clubMembership.findMany({
      where,
      select: {
        id: true,
        isPlayer: true,
        isCoach: true,
        isReferee: true,
        primaryPosition: true,
        joinedAt: true,
        user: { select: { id: true, name: true, photoUrl: true } },
      },
      orderBy: [{ joinedAt: "asc" }, { id: "asc" }],
      take: query.limit,
      skip: query.offset,
    }),
    prisma.clubMembership.count({ where }),
    prisma.clubRole.findMany({ where: { clubId, toAt: null }, select: { userId: true, role: true } }),
  ]);
  return {
    members: rows.map((m) => ({
      ...m,
      roles: roles.filter((r) => r.userId === m.user.id).map((r) => r.role),
    })),
    total,
  };
}
