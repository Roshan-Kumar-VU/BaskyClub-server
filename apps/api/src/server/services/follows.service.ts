// One-way follows, Instagram-style: no approval, no follow-back (#64, #73, #74).
import { z } from "zod";
import { prisma } from "../db";
import { badRequest, notFound } from "../errors";
import { uuid } from "../http";
import { requireActive, type Viewer } from "../auth/viewer";

export const followInput = z.object({
  targetType: z.enum(["club", "organization", "user"]),
  targetId: uuid,
});
export type FollowTarget = z.infer<typeof followInput>;

/** Only things the public can see can be followed. */
async function requireFollowable(viewer: Viewer, t: FollowTarget) {
  if (t.targetType === "user") {
    if (t.targetId === viewer.id) throw badRequest("self_follow", "You can't follow yourself.");
    const u = await prisma.user.findUnique({ where: { id: t.targetId }, select: { status: true } });
    if (!u || !["active", "limited"].includes(u.status)) throw notFound("Person");
  } else if (t.targetType === "club") {
    const c = await prisma.club.findFirst({ where: { id: t.targetId, status: "approved", deletedAt: null } });
    if (!c) throw notFound("Club");
  } else {
    const o = await prisma.organization.findFirst({ where: { id: t.targetId, pageStatus: { in: ["published", "claimed"] } } });
    if (!o) throw notFound("Association");
  }
}

export async function follow(viewer: Viewer, t: FollowTarget) {
  requireActive(viewer);
  await requireFollowable(viewer, t);
  await prisma.follow.createMany({ data: [{ followerId: viewer.id, ...t }], skipDuplicates: true });
  return { following: true, followerCount: await followerCount(t) };
}

export async function unfollow(viewer: Viewer, t: FollowTarget) {
  await prisma.follow.deleteMany({ where: { followerId: viewer.id, ...t } });
  return { following: false, followerCount: await followerCount(t) };
}

export function followerCount(t: FollowTarget) {
  return prisma.follow.count({ where: { targetType: t.targetType, targetId: t.targetId } });
}

export async function isFollowing(viewer: Viewer | null, t: FollowTarget) {
  if (!viewer) return false;
  return !!(await prisma.follow.findFirst({ where: { followerId: viewer.id, ...t }, select: { id: true } }));
}

/** What I follow, with names, for the "Following" list. */
export async function myFollows(viewer: Viewer) {
  const rows = await prisma.follow.findMany({ where: { followerId: viewer.id }, orderBy: { createdAt: "desc" } });
  const ids = (type: string) => rows.filter((r) => r.targetType === type).map((r) => r.targetId);
  const [users, clubs, orgs] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: ids("user") } }, select: { id: true, name: true, photoUrl: true } }),
    prisma.club.findMany({ where: { id: { in: ids("club") } }, select: { id: true, name: true, logoUrl: true, kind: true } }),
    prisma.organization.findMany({ where: { id: { in: ids("organization") } }, select: { id: true, name: true, shortName: true, logoUrl: true } }),
  ]);
  return { users, clubs, organizations: orgs };
}
