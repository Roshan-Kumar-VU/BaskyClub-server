// Profile page (#72) and "edit profile" in settings.
// Shown: photo, name, cover, bio, Instagram/YouTube (hidden for under-18), one pinned post,
// clubs with position, posts. Never shown: email, phone, date of birth.
import { LIMITS } from "@baskyclub/shared";
import { z } from "zod";
import { prisma } from "../db";
import { badRequest, notFound } from "../errors";
import { uuid } from "../http";
import type { Viewer } from "../auth/viewer";
import { ageOn } from "../lib/dates";
import { mediaUrl } from "../lib/media";
import { followerCount, isFollowing } from "./follows.service";
import { getPost } from "./posts.service";

const handle = z
  .string()
  .trim()
  .max(100)
  .transform((s) => s.replace(/^@/, ""))
  .refine((s) => /^[A-Za-z0-9._-]+$/.test(s), "Enter just the username, e.g. vellorehoops");

export const updateProfileInput = z
  .object({
    name: z.string().trim().min(LIMITS.personName.min).max(LIMITS.personName.max),
    bio: z.string().trim().max(300).nullable(),
    photoUrl: mediaUrl.nullable(),
    coverPhotoUrl: mediaUrl.nullable(),
    instagram: handle.nullable(),
    youtube: z.string().trim().max(200).nullable(),
    gender: z.enum(["male", "female", "other"]).nullable(),
    homeDistrictCode: z.string().trim().toUpperCase(),
    pinnedPostId: uuid.nullable(),
  })
  .partial();

export async function getProfile(viewer: Viewer | null, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      photoUrl: true,
      coverPhotoUrl: true,
      bio: true,
      instagram: true,
      youtube: true,
      pinnedPostId: true,
      dateOfBirth: true,
      status: true,
      homeDistrictCode: true,
      homeDistrict: { select: { name: true } },
      createdAt: true,
      memberships: {
        where: { status: "active", club: { status: "approved", deletedAt: null } },
        select: {
          id: true,
          primaryPosition: true,
          isPlayer: true,
          isCoach: true,
          joinedAt: true,
          club: {
            select: {
              id: true,
              name: true,
              kind: true,
              logoUrl: true,
              districtCode: true,
              badges: { where: { status: "active", badge: "basky_verified" }, select: { id: true }, take: 1 },
              affiliations: {
                where: { status: "active", OR: [{ validUntil: null }, { validUntil: { gte: new Date(new Date().toISOString().slice(0, 10)) } }] },
                select: { organization: { select: { id: true, name: true, shortName: true } } },
                take: 1,
              },
            },
          },
        },
        orderBy: { joinedAt: "asc" },
      },
      clubRoles: { where: { toAt: null }, select: { clubId: true, role: true } },
      badges: { where: { status: "active", badge: "creator" }, select: { id: true } },
      _count: { select: { follows: true } },
    },
  });
  if (!user || !["active", "limited"].includes(user.status)) throw notFound("Profile");

  const isMinor = ageOn(user.dateOfBirth) < 18;
  const target = { targetType: "user" as const, targetId: user.id };
  const [followers, following, pinnedPost] = await Promise.all([
    followerCount(target),
    isFollowing(viewer, target),
    user.pinnedPostId ? getPost(viewer, user.pinnedPostId).catch(() => null) : null,
  ]);

  return {
    id: user.id,
    name: user.name,
    photoUrl: user.photoUrl,
    coverPhotoUrl: user.coverPhotoUrl,
    bio: user.bio,
    // Under-18: social links never shown (#72)
    instagram: isMinor ? null : user.instagram,
    youtube: isMinor ? null : user.youtube,
    homeDistrict: user.homeDistrictCode ? { code: user.homeDistrictCode, name: user.homeDistrict?.name } : null,
    isCreator: user.badges.length > 0,
    memberSince: user.createdAt,
    clubs: user.memberships.map(({ club: { badges, affiliations, ...club }, ...m }) => ({
      ...club,
      membershipId: m.id,
      isVerified: badges.length > 0,
      affiliatedTo: affiliations[0]?.organization ?? null,
      position: m.isPlayer ? m.primaryPosition : null,
      isPlayer: m.isPlayer,
      isCoach: m.isCoach,
      roles: user.clubRoles.filter((r) => r.clubId === club.id).map((r) => r.role),
    })),
    pinnedPost,
    followerCount: followers,
    followingCount: user._count.follows,
    viewer: { isMe: viewer?.id === user.id, isFollowing: following },
  };
}

export async function updateMyProfile(viewer: Viewer, input: z.infer<typeof updateProfileInput>) {
  if (input.homeDistrictCode) {
    const d = await prisma.district.findUnique({ where: { code: input.homeDistrictCode } });
    if (!d) throw badRequest("unknown_district", "Choose a district from the list.");
  }
  if (input.pinnedPostId) {
    const post = await prisma.post.findUnique({ where: { id: input.pinnedPostId } });
    if (!post || post.deletedAt || post.authorId !== viewer.id) throw notFound("Post");
    if (post.moderationStatus !== "published" || post.visibility === "members") {
      throw badRequest("cannot_pin", "Only your published public or club-page posts can be pinned.");
    }
  }
  await prisma.user.update({ where: { id: viewer.id }, data: input });
  return getProfile(viewer, viewer.id);
}

// ---- Find people (to add them to a club or association team) ---------------------------------

export const searchPeopleQuery = z.object({ q: z.string().trim().min(2, "Type at least 2 letters.").max(60) });

/** Logged-in only, so the member list can't be scraped. Name or exact phone number. */
export async function searchPeople(query: z.infer<typeof searchPeopleQuery>) {
  const digits = query.q.replace(/\D/g, "");
  const phone = digits.length >= 10 ? `+91${digits.slice(-10)}` : null;
  const users = await prisma.user.findMany({
    where: {
      status: { in: ["active", "limited"] },
      OR: [{ name: { contains: query.q, mode: "insensitive" } }, ...(phone ? [{ phone }] : [])],
    },
    select: { id: true, name: true, photoUrl: true, homeDistrictCode: true },
    orderBy: { name: "asc" },
    take: 20,
  });
  return { people: users };
}
