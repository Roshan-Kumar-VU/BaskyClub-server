// Badges given by the Basky team (#35, #73): "basky_verified" for clubs/academies, "creator" for people.
import { z } from "zod";
import { prisma } from "../db";
import { badRequest, conflict, forbidden, notFound } from "../errors";
import { uuid } from "../http";
import { requireActive, type Viewer } from "../auth/viewer";
import { DAY_MS } from "../lib/dates";
import { sendPush } from "../lib/push";
import { logChange, requireBaskyTeam } from "../permissions";

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .transform((s) => new Date(`${s}T00:00:00.000Z`));

export const giveBadgeInput = z
  .object({
    badge: z.enum(["basky_verified", "creator"]),
    clubId: uuid.optional(),
    userId: uuid.optional(),
    expiresAt: dateOnly.optional(),
  })
  .refine((b) => (b.clubId ? 1 : 0) + (b.userId ? 1 : 0) === 1, { message: "Give the badge to one club or one person." })
  .refine((b) => (b.badge === "basky_verified" ? !!b.clubId : !!b.userId), {
    message: "Verified is for clubs/academies; Creator is for people.",
  });

export async function giveBadge(viewer: Viewer, input: z.infer<typeof giveBadgeInput>) {
  requireBaskyTeam(viewer);
  if (input.clubId) {
    const club = await prisma.club.findFirst({ where: { id: input.clubId, deletedAt: null, status: "approved" } });
    if (!club) throw notFound("Club");
    if (!["club", "academy"].includes(club.kind)) throw badRequest("wrong_kind", "Verified badges are for clubs and academies.");
  } else {
    const user = await prisma.user.findUnique({ where: { id: input.userId! } });
    if (!user || user.status !== "active") throw notFound("Person");
  }
  const existing = await prisma.verificationBadge.findFirst({
    where: { badge: input.badge, status: "active", ...(input.clubId ? { clubId: input.clubId } : { userId: input.userId }) },
  });
  if (existing) throw conflict("already_has_badge", "This badge is already active.");

  const open = input.userId
    ? await prisma.verificationBadge.findFirst({ where: { userId: input.userId, badge: "creator", status: "requested" } })
    : null;
  const row = await prisma.$transaction(async (tx) => {
    if (open) {
      // Giving the badge directly also closes the person's open request.
      const b = await tx.verificationBadge.update({ where: { id: open.id }, data: { status: "active", verifiedById: viewer.id, verifiedAt: new Date(), expiresAt: input.expiresAt } });
      await logChange(tx, viewer.id, "verification_badges", b.id, "update", { status: "requested" }, { status: "active" });
      return b;
    }
    const b = await tx.verificationBadge.create({ data: { ...input, verifiedById: viewer.id } });
    await logChange(tx, viewer.id, "verification_badges", b.id, "create", null, { badge: b.badge, clubId: b.clubId, userId: b.userId });
    return b;
  });
  return { id: row.id, badge: row.badge };
}

export async function revokeBadge(viewer: Viewer, badgeId: string) {
  requireBaskyTeam(viewer);
  const row = await prisma.verificationBadge.findUnique({ where: { id: badgeId } });
  if (!row || row.status !== "active") throw notFound("Badge");
  await prisma.$transaction(async (tx) => {
    await tx.verificationBadge.update({ where: { id: row.id }, data: { status: "revoked" } });
    await logChange(tx, viewer.id, "verification_badges", row.id, "update", { status: "active" }, { status: "revoked" });
  });
  return { ok: true };
}

export async function listBadges(viewer: Viewer) {
  requireBaskyTeam(viewer);
  const rows = await prisma.verificationBadge.findMany({
    where: { status: "active" },
    include: { club: { select: { id: true, name: true } }, user: { select: { id: true, name: true } } },
    orderBy: { verifiedAt: "desc" },
  });
  return { badges: rows };
}

// ---- Creator badge requests ------------------------------------------------------------------
// A request is a verification_badges row with status "requested" (no new table). The Basky team
// approves it (→ "active") or declines it (→ "declined", note kept in change_log). Only "active"
// rows give Creator powers anywhere in the code, so a request never counts as a badge.
// Rules: adults with an active account; one open request at a time; 30 days before asking again
// after a decline; the profile (bio, Instagram, YouTube, posts, followers) is what the team reviews.

export const REASK_DAYS = 30;


/** Where the logged-in person stands: none / requested / active / declined (with when they can ask again). */
export async function creatorStatus(userId: string) {
  const latest = await prisma.verificationBadge.findFirst({
    where: { userId, badge: "creator", status: { in: ["requested", "active", "declined"] } },
    orderBy: { verifiedAt: "desc" },
    select: { id: true, status: true, verifiedAt: true },
  });
  if (!latest) return { status: "none" as const };
  if (latest.status === "declined") {
    const canAskFrom = new Date(latest.verifiedAt.getTime() + REASK_DAYS * DAY_MS);
    if (canAskFrom <= new Date()) return { status: "none" as const };
    return { status: "declined" as const, decidedAt: latest.verifiedAt, canAskFrom, note: await declineNote(latest.id) };
  }
  return { status: latest.status as "requested" | "active", since: latest.verifiedAt, requestId: latest.id };
}

async function declineNote(badgeId: string): Promise<string | null> {
  const log = await prisma.changeLog.findFirst({
    where: { entity: "verification_badges", entityId: badgeId, action: "update" },
    orderBy: { at: "desc" },
    select: { afterValue: true },
  });
  const v = log?.afterValue as { note?: string } | null;
  return v?.note ?? null;
}

export async function requestCreatorBadge(viewer: Viewer) {
  requireActive(viewer);
  if (viewer.isMinor) throw forbidden("adults_only", "The Creator badge is for people aged 18 or over.");
  const now = await creatorStatus(viewer.id);
  if (now.status === "active") throw conflict("already_creator", "You already have the Creator badge.");
  if (now.status === "requested") throw conflict("already_requested", "Your request is already with the BaskyCLub team.");
  if (now.status === "declined") {
    throw conflict("ask_later", `You can ask again from ${now.canAskFrom.toISOString().slice(0, 10)}.`);
  }
  const row = await prisma.$transaction(async (tx) => {
    const b = await tx.verificationBadge.create({ data: { badge: "creator", userId: viewer.id, status: "requested" } });
    await logChange(tx, viewer.id, "verification_badges", b.id, "create", null, { badge: "creator", status: "requested" });
    return b;
  });
  return { requestId: row.id, status: "requested" };
}

export async function withdrawCreatorRequest(viewer: Viewer) {
  const row = await prisma.verificationBadge.findFirst({ where: { userId: viewer.id, badge: "creator", status: "requested" } });
  if (!row) throw notFound("Request");
  await prisma.$transaction(async (tx) => {
    await tx.verificationBadge.update({ where: { id: row.id }, data: { status: "withdrawn" } });
    await logChange(tx, viewer.id, "verification_badges", row.id, "update", { status: "requested" }, { status: "withdrawn" });
  });
  return { ok: true };
}

/** Basky team: open requests, oldest first, with what's needed to judge them. */
export async function listCreatorRequests(viewer: Viewer) {
  requireBaskyTeam(viewer);
  const rows = await prisma.verificationBadge.findMany({
    where: { badge: "creator", status: "requested", user: { status: "active" } },
    orderBy: { verifiedAt: "asc" },
    select: {
      id: true,
      verifiedAt: true,
      user: {
        select: {
          id: true, name: true, photoUrl: true, bio: true, instagram: true, youtube: true, homeDistrictCode: true, createdAt: true,
          _count: { select: { posts: { where: { deletedAt: null, moderationStatus: "published" } } } },
        },
      },
    },
  });
  const followers = rows.length
    ? await prisma.follow.groupBy({ by: ["targetId"], where: { targetType: "user", targetId: { in: rows.map((r) => r.user!.id) } }, _count: { _all: true } })
    : [];
  const count = new Map(followers.map((f) => [f.targetId, f._count._all]));
  return {
    requests: rows.map((r) => {
      const { _count, ...u } = r.user!;
      return { id: r.id, requestedAt: r.verifiedAt, person: { ...u, posts: _count.posts, followers: count.get(u.id) ?? 0 } };
    }),
  };
}

export const decideCreatorInput = z.object({
  decision: z.enum(["approve", "decline"]),
  note: z.string().trim().max(500).optional(),
});

export async function decideCreatorRequest(viewer: Viewer, requestId: string, input: z.infer<typeof decideCreatorInput>) {
  requireBaskyTeam(viewer);
  const row = await prisma.verificationBadge.findUnique({ where: { id: requestId }, include: { user: { select: { status: true } } } });
  if (!row || row.badge !== "creator" || row.status !== "requested") throw notFound("Request");
  if (row.userId === viewer.id) throw forbidden("own_request", "Someone else in the team has to decide your own request.");
  if (input.decision === "decline" && !input.note) throw badRequest("note_needed", "Say why, so the person knows what to improve.");
  const status = input.decision === "approve" ? "active" : "declined";
  await prisma.$transaction(async (tx) => {
    await tx.verificationBadge.update({ where: { id: row.id }, data: { status, verifiedById: viewer.id, verifiedAt: new Date() } });
    await logChange(tx, viewer.id, "verification_badges", row.id, "update", { status: "requested" }, { status, ...(input.note ? { note: input.note } : {}) });
  });
  const tokens = await prisma.deviceToken.findMany({ where: { userId: row.userId! }, select: { token: true } });
  await sendPush(
    tokens.map((t) => ({
      to: t.token,
      title: input.decision === "approve" ? "You're a BaskyCLub Creator!" : "About your Creator badge request",
      body: input.decision === "approve" ? "Your posts now go live straight away." : input.note!,
      data: { type: "creator_badge", status },
    })),
  );
  return { id: row.id, status };
}
