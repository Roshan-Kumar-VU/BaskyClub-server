// Posts and feeds (#22, #24, #41, #57; SCHEMA_PHASE1 rules 5 and 10).
//
// Who sees a post:
//   public    — everyone: All India / district feeds, club page, profile, share link
//   club_page — everyone, but only on the club page, the author's profile and the
//               "Following" feed of the club's members and followers (not in All India / district)
//   members   — only active members of the tagged club (and moderators)
// Posts that are not "published" (in_review / hidden / removed) are seen only by their author
// and moderators. Deleted posts are seen by nobody.
//
// Posting rules (#41): club/academy members and BaskyCLub staff → published straight away
// (AI check comes later); people without a club → "in_review" until a moderator approves.
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../db";
import { env } from "../env";
import { badRequest, forbidden, notFound } from "../errors";
import { uuid } from "../http";
import { requireActive, type Viewer } from "../auth/viewer";
import { decodeCursor, encodeCursor, olderThan } from "../lib/cursor";
import { limitRate } from "../lib/rate-limit";
import { mediaUrl } from "../lib/media";
import { LIMITS, normalizeYouTubeUrl, type MediaType, type ModerationStatus, type PostCardData, type Visibility } from "@baskyclub/shared";
import { activeClubIds, getClubPowers, getOrgPowers, isBaskyTeam, isModerator } from "../permissions";

export const VISIBILITIES = ["public", "club_page", "members"] as const;
const MAX_IMAGES = 10;
const POSTS_PER_HOUR = 10;

export const createPostInput = z
  .object({
    content: z.string().trim().max(LIMITS.postContent.max).optional(),
    clubId: uuid.optional(),
    /** Official post for an association (its members and the Basky team only). */
    organizationId: uuid.optional(),
    visibility: z.enum(VISIBILITIES).default("public"),
    // Photos are uploaded first (POST /api/uploads); here we get their links.
    images: z
      .array(z.object({ url: mediaUrl, width: z.number().int().positive().optional(), height: z.number().int().positive().optional() }))
      .max(MAX_IMAGES, `Up to ${MAX_IMAGES} photos per post.`)
      .default([]),
    youtubeUrl: z.string().optional(),
  })
  .refine((p) => (p.content && p.content.length > 0) || p.images.length > 0 || p.youtubeUrl, {
    message: "Write something or add a photo or video.",
    path: ["content"],
  });

export const updatePostInput = z.object({ content: z.string().trim().min(LIMITS.postContent.min).max(LIMITS.postContent.max) });

export const feedQuery = z.object({
  scope: z.enum(["all", "district", "following"]).default("all"),
  districtCode: z.string().trim().toUpperCase().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export const pageQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ---- Who can post without review ----------------------------------------------------

/**
 * Trusted to publish straight away (#41): BaskyCLub staff, members of an approved club/academy,
 * association office holders (organization_members), and verified Creators (#73).
 * Everyone else's posts wait for review.
 */
async function isTrustedPoster(viewer: Viewer): Promise<boolean> {
  if (viewer.platformRoles.size > 0) return true;
  const [membership, orgRole, creator] = await Promise.all([
    prisma.clubMembership.findFirst({
      where: { userId: viewer.id, status: "active", club: { status: "approved", deletedAt: null } },
      select: { id: true },
    }),
    prisma.organizationMember.findFirst({ where: { userId: viewer.id, toAt: null }, select: { id: true } }),
    prisma.verificationBadge.findFirst({ where: { userId: viewer.id, badge: "creator", status: "active" }, select: { id: true } }),
  ]);
  return !!(membership || orgRole || creator);
}

// ---- Post cards (what the app shows) ------------------------------------------------------

const postCardSelect = {
  id: true,
  content: true,
  visibility: true,
  moderationStatus: true,
  createdAt: true,
  updatedAt: true,
  districtCode: true,
  isPinned: true,
  likeCount: true,
  commentCount: true,
  shareCount: true,
  authorId: true,
  clubId: true,
  author: { select: { id: true, name: true, photoUrl: true } },
  club: { select: { id: true, name: true, logoUrl: true } },
  organization: { select: { id: true, name: true, shortName: true, logoUrl: true } },
  media: {
    where: { status: "visible" },
    orderBy: { sortOrder: "asc" },
    select: { mediaType: true, url: true, width: true, height: true },
  },
} satisfies Prisma.PostSelect;
type PostRow = Prisma.PostGetPayload<{ select: typeof postCardSelect }>;

export function shareUrl(postId: string) {
  return `${env.appUrl}/p/${postId}`;
}

async function toCards(viewer: Viewer | null, rows: PostRow[]) {
  const ids = rows.map((r) => r.id);
  const authorIds = [...new Set(rows.map((r) => r.authorId))];
  const [liked, creators] = await Promise.all([
    viewer && ids.length
      ? prisma.postLike.findMany({ where: { userId: viewer.id, postId: { in: ids } }, select: { postId: true } })
      : [],
    authorIds.length
      ? prisma.verificationBadge.findMany({
          where: { userId: { in: authorIds }, badge: "creator", status: "active" },
          select: { userId: true },
        })
      : [],
  ]);
  const likedSet = new Set(liked.map((l) => l.postId));
  const creatorSet = new Set(creators.map((c) => c.userId));
  const mod = isModerator(viewer);

  // Shape shared with the apps (packages/shared wire.ts). Text columns hold only the values
  // the API writes, so they are narrowed to their unions here, once.
  return rows.map((r): PostCardData => ({
    id: r.id,
    content: r.content,
    visibility: r.visibility as Visibility,
    moderationStatus: r.moderationStatus as ModerationStatus,
    createdAt: r.createdAt,
    edited: r.updatedAt.getTime() - r.createdAt.getTime() > 1000,
    districtCode: r.districtCode,
    isPinned: r.isPinned,
    author: { id: r.author.id, name: r.author.name, photoUrl: r.author.photoUrl, isCreator: creatorSet.has(r.authorId) },
    club: r.club,
    organization: r.organization,
    media: r.media.map((m) => ({ ...m, mediaType: m.mediaType as MediaType })),
    likeCount: r.likeCount,
    commentCount: r.commentCount,
    shareCount: r.shareCount,
    likedByMe: likedSet.has(r.id),
    shareUrl: r.visibility === "members" ? null : shareUrl(r.id),
    canEdit: viewer?.id === r.authorId,
    canDelete: viewer?.id === r.authorId || mod,
  }));
}

async function page(viewer: Viewer | null, where: Prisma.PostWhereInput, cursor: string | undefined, limit: number) {
  const rows = await prisma.post.findMany({
    where: { AND: [where, olderThan(decodeCursor(cursor))] },
    select: postCardSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });
  const more = rows.length > limit;
  const pageRows = more ? rows.slice(0, limit) : rows;
  return { posts: await toCards(viewer, pageRows), nextCursor: more ? encodeCursor(pageRows.at(-1)) : null };
}

/** Never show posts by suspended or deleted accounts. */
const liveAuthor: Prisma.PostWhereInput = { author: { status: { in: ["active", "limited"] } } };

/** Published, plus the viewer's own posts that are still waiting for review. */
function publishedOrOwn(viewer: Viewer | null): Prisma.PostWhereInput {
  return viewer
    ? { OR: [{ moderationStatus: "published" }, { authorId: viewer.id, moderationStatus: { in: ["in_review", "hidden"] } }] }
    : { moderationStatus: "published" };
}

// ---- Can this person see this post? ------------------------------------------------------

async function findVisiblePost(viewer: Viewer | null, postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { ...postCardSelect, deletedAt: true, author: { select: { id: true, name: true, photoUrl: true, status: true } } },
  });
  if (!post || post.deletedAt) throw notFound("Post");
  const isAuthor = viewer?.id === post.authorId;
  if (isAuthor || isModerator(viewer)) return post;
  if (post.moderationStatus !== "published" || !["active", "limited"].includes(post.author.status)) throw notFound("Post");
  if (post.visibility === "members") {
    if (!post.clubId || !(await activeClubIds(viewer)).includes(post.clubId)) throw notFound("Post");
  }
  return post;
}

/** For likes, comments and shares: the post must be visible AND published. */
export async function requireInteractivePost(viewer: Viewer | null, postId: string) {
  const post = await findVisiblePost(viewer, postId);
  if (post.moderationStatus !== "published") {
    throw badRequest("not_published", "This post is waiting for review.");
  }
  return post;
}

// ---- Create / edit / delete ------------------------------------------------------------------

export async function createPost(viewer: Viewer, input: z.infer<typeof createPostInput>) {
  requireActive(viewer);
  await limitRate((since) => prisma.post.count({ where: { authorId: viewer.id, createdAt: { gte: since } } }), POSTS_PER_HOUR, 3600, "posting");

  let youtube: string | null = null;
  if (input.youtubeUrl) {
    youtube = normalizeYouTubeUrl(input.youtubeUrl);
    if (!youtube) throw badRequest("bad_youtube_link", "That doesn't look like a YouTube link.");
  }

  // District is filled automatically (rule 10): club post → club's district; otherwise the author's home district.
  let districtCode: string | null = null;
  if (input.organizationId) {
    if (input.clubId) throw badRequest("one_sender", "A post is either for a club or for an association, not both.");
    if (input.visibility !== "public") throw badRequest("official_public", "Official association posts are public.");
    const org = await prisma.organization.findFirst({ where: { id: input.organizationId, pageStatus: { in: ["published", "claimed"] } } });
    if (!org) throw notFound("Association");
    const powers = await getOrgPowers(viewer, org.id);
    if (!powers.isMember && !isBaskyTeam(viewer)) {
      throw forbidden("association_members_only", "Only the association's own team can post for it.");
    }
    // District association → the author's district if covered, else the first district it covers
    if (org.level === "district") {
      const covered = await prisma.district.findMany({ where: { associationId: org.id }, select: { code: true }, orderBy: { code: "asc" } });
      const me = await prisma.user.findUniqueOrThrow({ where: { id: viewer.id }, select: { homeDistrictCode: true } });
      districtCode = covered.find((d) => d.code === me.homeDistrictCode)?.code ?? covered[0]?.code ?? null;
    }
  } else if (input.clubId) {
    const club = await prisma.club.findFirst({ where: { id: input.clubId, deletedAt: null, status: "approved" } });
    if (!club) throw notFound("Club");
    const powers = await getClubPowers(viewer, club.id);
    if (!powers.isMember && !powers.isStaff) {
      throw forbidden("members_only", "Only members of this club can post for it.");
    }
    districtCode = club.districtCode;
  } else {
    if (input.visibility !== "public") {
      throw badRequest("club_required", "Choose a club for club-page or members-only posts.");
    }
    const me = await prisma.user.findUniqueOrThrow({ where: { id: viewer.id }, select: { homeDistrictCode: true } });
    districtCode = me.homeDistrictCode;
  }

  const trusted = await isTrustedPoster(viewer);
  const media = [
    ...input.images.map((img, i) => ({ mediaType: "image", url: img.url, width: img.width, height: img.height, sortOrder: i })),
    ...(youtube ? [{ mediaType: "youtube", url: youtube, sortOrder: input.images.length }] : []),
  ];

  const post = await prisma.$transaction(async (tx) => {
    const created = await tx.post.create({
      data: {
        authorId: viewer.id,
        clubId: input.clubId,
        organizationId: input.organizationId,
        districtCode,
        visibility: input.visibility,
        content: input.content || null,
        moderationStatus: trusted ? "published" : "in_review",
        media: { create: media },
      },
    });
    if (!trusted) {
      await tx.moderationCase.create({ data: { targetType: "post", targetId: created.id, source: "no_club_review" } });
    }
    return created;
  });

  // TODO(ai-moderation): run the AI check on published posts and open a case if flagged.
  const [card] = await toCards(viewer, [await prisma.post.findUniqueOrThrow({ where: { id: post.id }, select: postCardSelect })]);
  return card;
}

export async function updatePost(viewer: Viewer, postId: string, input: z.infer<typeof updatePostInput>) {
  requireActive(viewer);
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.deletedAt) throw notFound("Post");
  if (post.authorId !== viewer.id) throw forbidden("author_only", "Only the author can edit this post.");
  if (post.moderationStatus === "removed") throw forbidden("removed", "This post was removed by a moderator.");

  // An untrusted author's edit goes back to review, so a reviewed post can't be swapped for something else.
  const trusted = await isTrustedPoster(viewer);
  await prisma.$transaction(async (tx) => {
    await tx.post.update({
      where: { id: post.id },
      data: { content: input.content, ...(trusted ? {} : { moderationStatus: "in_review" }) },
    });
    if (!trusted && post.moderationStatus === "published") {
      await tx.moderationCase.create({ data: { targetType: "post", targetId: post.id, source: "no_club_review", reason: "edited" } });
    }
  });
  return getPost(viewer, post.id);
}

export async function deletePost(viewer: Viewer, postId: string) {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.deletedAt) throw notFound("Post");
  if (post.authorId !== viewer.id && !isModerator(viewer)) {
    throw forbidden("author_only", "Only the author or a moderator can delete this post.");
  }
  await prisma.$transaction([
    prisma.post.update({ where: { id: post.id }, data: { deletedAt: new Date() } }),
    // A deleted post can't stay pinned on a profile
    prisma.user.updateMany({ where: { pinnedPostId: post.id }, data: { pinnedPostId: null } }),
  ]);
  return { ok: true };
}

// ---- Reading -----------------------------------------------------------------------------------

export async function getPost(viewer: Viewer | null, postId: string) {
  const post = await findVisiblePost(viewer, postId);
  const [card] = await toCards(viewer, [post]);
  return card;
}

const PINNED_DAYS = 14;

/** Official cards from announcements (#75), shown above the first page of All India / district feeds. */
async function pinnedCards(viewer: Viewer | null, districtCode: string | null) {
  const rows = await prisma.post.findMany({
    where: {
      isPinned: true,
      deletedAt: null,
      moderationStatus: "published",
      visibility: "public",
      createdAt: { gte: new Date(Date.now() - PINNED_DAYS * 864e5) },
      OR: districtCode ? [{ districtCode }, { districtCode: null }] : [{ districtCode: null }],
    },
    select: postCardSelect,
    orderBy: { createdAt: "desc" },
    take: 3,
  });
  return toCards(viewer, rows);
}

export async function feed(viewer: Viewer | null, query: z.infer<typeof feedQuery>) {
  if (query.scope === "district") {
    if (!query.districtCode) throw badRequest("district_required", "Choose a district.");
    const result = await page(viewer, { deletedAt: null, moderationStatus: "published", visibility: "public", districtCode: query.districtCode, ...liveAuthor }, query.cursor, query.limit);
    return { pinned: query.cursor ? [] : await pinnedCards(viewer, query.districtCode), ...result };
  }
  if (query.scope === "all") {
    const result = await page(viewer, { deletedAt: null, moderationStatus: "published", visibility: "public", ...liveAuthor }, query.cursor, query.limit);
    return { pinned: query.cursor ? [] : await pinnedCards(viewer, null), ...result };
  }

  // Following: people, clubs and associations I follow + my clubs + my own posts
  if (!viewer) throw badRequest("login_required", "Log in to see posts from what you follow.");
  const [follows, myClubs] = await Promise.all([
    prisma.follow.findMany({ where: { followerId: viewer.id }, select: { targetType: true, targetId: true } }),
    activeClubIds(viewer),
  ]);
  const ids = (type: string) => follows.filter((f) => f.targetType === type).map((f) => f.targetId);
  const users = ids("user");
  const clubs = ids("club");
  const orgs = ids("organization");

  const where: Prisma.PostWhereInput = {
    deletedAt: null,
    ...liveAuthor,
    OR: [
      { authorId: viewer.id, moderationStatus: { in: ["published", "in_review", "hidden"] } },
      {
        moderationStatus: "published",
        OR: [
          { visibility: "public", OR: [{ authorId: { in: users } }, { clubId: { in: [...clubs, ...myClubs] } }, { organizationId: { in: orgs } }] },
          { visibility: "club_page", clubId: { in: [...clubs, ...myClubs] } },
          { visibility: "members", clubId: { in: myClubs } },
        ],
      },
    ],
  };
  return page(viewer, where, query.cursor, query.limit);
}

/** Posts on a club page. */
export async function clubPosts(viewer: Viewer | null, clubId: string, query: z.infer<typeof pageQuery>) {
  const club = await prisma.club.findFirst({ where: { id: clubId, deletedAt: null } });
  if (!club) throw notFound("Club");
  const powers = await getClubPowers(viewer, clubId);
  if (club.status !== "approved" && !powers.canManage) throw notFound("Club");

  const seeMembersOnly = powers.isMember || powers.isStaff || isModerator(viewer);
  const visibilities: string[] = seeMembersOnly ? ["public", "club_page", "members"] : ["public", "club_page"];
  return page(viewer, { clubId, deletedAt: null, visibility: { in: visibilities }, ...liveAuthor, ...publishedOrOwn(viewer) }, query.cursor, query.limit);
}

/** Official posts on an association page. */
export async function orgPosts(viewer: Viewer | null, organizationId: string, query: z.infer<typeof pageQuery>) {
  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!org) throw notFound("Association");
  const powers = await getOrgPowers(viewer, organizationId);
  if (!["published", "claimed"].includes(org.pageStatus) && !powers.isMember && !isBaskyTeam(viewer)) throw notFound("Association");
  return page(viewer, { organizationId, deletedAt: null, visibility: "public", ...liveAuthor, ...publishedOrOwn(viewer) }, query.cursor, query.limit);
}

/** Posts on someone's profile. */
export async function userPosts(viewer: Viewer | null, userId: string, query: z.infer<typeof pageQuery>) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } });
  if (!user || !["active", "limited"].includes(user.status)) throw notFound("Profile");

  if (viewer?.id === userId) {
    return page(viewer, { authorId: userId, deletedAt: null, moderationStatus: { not: "removed" } }, query.cursor, query.limit);
  }
  const myClubs = await activeClubIds(viewer);
  return page(
    viewer,
    {
      authorId: userId,
      deletedAt: null,
      moderationStatus: "published",
      OR: [{ visibility: { in: ["public", "club_page"] } }, { visibility: "members", clubId: { in: myClubs } }],
    },
    query.cursor,
    query.limit,
  );
}

/** Counts a share (the app shares shareUrl; this keeps the number on the post). */
export async function sharePost(viewer: Viewer, postId: string) {
  const post = await requireInteractivePost(viewer, postId);
  if (post.visibility === "members") throw badRequest("members_only", "Members-only posts can't be shared outside the club.");
  const updated = await prisma.post.update({ where: { id: post.id }, data: { shareCount: { increment: 1 } } });
  return { shareUrl: shareUrl(post.id), shareCount: updated.shareCount };
}
