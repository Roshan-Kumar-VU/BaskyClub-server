// Likes and comments (REQUIREMENTS section 8).
// - One like per person per post (database unique rule); counts are kept by database triggers.
// - Comments have one level of replies. Replying to a reply attaches to the same top-level
//   comment and starts with "@Name". Deleting leaves "Comment removed" if it has replies.
// - Spam limit: 5 comments a minute per person.
import { z } from "zod";
import { prisma } from "../db";
import { badRequest, forbidden, notFound } from "../errors";
import { uuid } from "../http";
import { requireActive, type Viewer } from "../auth/viewer";
import { decodeCursor, encodeCursor, newerThan } from "../lib/cursor";
import { limitRate } from "../lib/rate-limit";
import { isModerator } from "../permissions";
import { requireInteractivePost } from "./posts.service";

const COMMENTS_PER_MINUTE = 5;

export const createCommentInput = z.object({
  content: z.string().trim().min(1, "Write a comment.").max(1000),
  parentId: uuid.optional(),
});
export const commentsQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ---- Likes -----------------------------------------------------------------------

export async function likePost(viewer: Viewer, postId: string) {
  requireActive(viewer);
  await requireInteractivePost(viewer, postId);
  // Liking twice is harmless: the second one is simply ignored
  await prisma.postLike.createMany({ data: [{ postId, userId: viewer.id }], skipDuplicates: true });
  const post = await prisma.post.findUniqueOrThrow({ where: { id: postId }, select: { likeCount: true } });
  return { liked: true, likeCount: post.likeCount };
}

export async function unlikePost(viewer: Viewer, postId: string) {
  await prisma.postLike.deleteMany({ where: { postId, userId: viewer.id } });
  const post = await prisma.post.findUnique({ where: { id: postId }, select: { likeCount: true } });
  if (!post) throw notFound("Post");
  return { liked: false, likeCount: post.likeCount };
}

// ---- Comments ------------------------------------------------------------------------

const commentSelect = {
  id: true,
  postId: true,
  parentId: true,
  content: true,
  moderationStatus: true,
  createdAt: true,
  deletedAt: true,
  userId: true,
  user: { select: { id: true, name: true, photoUrl: true } },
} as const;

type CommentRow = {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  moderationStatus: string;
  createdAt: Date;
  deletedAt: Date | null;
  userId: string;
  user: { id: string; name: string; photoUrl: string | null };
};

const isGone = (c: { deletedAt: Date | null; moderationStatus: string }) => !!c.deletedAt || c.moderationStatus !== "published";

function toComment(viewer: Viewer | null, c: CommentRow, postAuthorId: string, replyCount?: number) {
  const removed = isGone(c);
  return {
    id: c.id,
    parentId: c.parentId,
    createdAt: c.createdAt,
    isRemoved: removed,
    content: removed ? null : c.content, // app shows "Comment removed"
    user: removed ? null : c.user,
    ...(replyCount !== undefined ? { replyCount } : {}),
    canDelete: !removed && (viewer?.id === c.userId || viewer?.id === postAuthorId || isModerator(viewer)),
  };
}

async function visibleReplyCounts(parentIds: string[]) {
  if (!parentIds.length) return new Map<string, number>();
  const rows = await prisma.postComment.groupBy({
    by: ["parentId"],
    where: { parentId: { in: parentIds }, deletedAt: null, moderationStatus: "published" },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [r.parentId!, r._count._all]));
}

/** Top-level comments, oldest first, 20 at a time. */
export async function listComments(viewer: Viewer | null, postId: string, query: z.infer<typeof commentsQuery>) {
  const post = await requireInteractivePost(viewer, postId);
  const rows = await prisma.postComment.findMany({
    where: { postId, parentId: null, ...newerThan(decodeCursor(query.cursor)) },
    select: commentSelect,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: query.limit + 1,
  });
  const more = rows.length > query.limit;
  const pageRows = more ? rows.slice(0, query.limit) : rows;
  const counts = await visibleReplyCounts(pageRows.map((r) => r.id));
  const comments = pageRows
    .map((c) => toComment(viewer, c, post.authorId, counts.get(c.id) ?? 0))
    // A removed comment with no replies left simply disappears
    .filter((c) => !c.isRemoved || (c.replyCount ?? 0) > 0);
  return { comments, commentCount: post.commentCount, nextCursor: more ? encodeCursor(pageRows.at(-1)) : null };
}

/** "View N replies". */
export async function listReplies(viewer: Viewer | null, commentId: string, query: z.infer<typeof commentsQuery>) {
  const parent = await prisma.postComment.findUnique({ where: { id: commentId } });
  if (!parent || parent.parentId) throw notFound("Comment");
  const post = await requireInteractivePost(viewer, parent.postId);
  const rows = await prisma.postComment.findMany({
    where: { parentId: commentId, deletedAt: null, moderationStatus: "published", ...newerThan(decodeCursor(query.cursor)) },
    select: commentSelect,
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    take: query.limit + 1,
  });
  const more = rows.length > query.limit;
  const pageRows = more ? rows.slice(0, query.limit) : rows;
  return { replies: pageRows.map((c) => toComment(viewer, c, post.authorId)), nextCursor: more ? encodeCursor(pageRows.at(-1)) : null };
}

export async function addComment(viewer: Viewer, postId: string, input: z.infer<typeof createCommentInput>) {
  requireActive(viewer);
  const post = await requireInteractivePost(viewer, postId);
  await limitRate(
    (since) => prisma.postComment.count({ where: { userId: viewer.id, createdAt: { gte: since } } }),
    COMMENTS_PER_MINUTE,
    60,
    "commenting",
  );

  let parentId: string | null = null;
  let content = input.content;
  if (input.parentId) {
    const parent = await prisma.postComment.findUnique({ where: { id: input.parentId }, include: { user: { select: { name: true } } } });
    if (!parent || parent.postId !== postId) throw notFound("Comment");
    if (isGone(parent)) throw badRequest("comment_removed", "You can't reply to a removed comment.");
    if (parent.parentId) {
      // Reply to a reply → same level, starting with @Name
      parentId = parent.parentId;
      const mention = `@${parent.user.name}`;
      if (!content.startsWith(mention)) content = `${mention} ${content}`;
    } else {
      parentId = parent.id;
    }
  }

  const created = await prisma.postComment.create({
    data: { postId, userId: viewer.id, parentId, content },
    select: commentSelect,
  });
  // TODO(alerts): tell the parent comment's author about the reply (Round 3 alerts).
  return toComment(viewer, created, post.authorId, parentId ? undefined : 0);
}

export async function deleteComment(viewer: Viewer, commentId: string) {
  const comment = await prisma.postComment.findUnique({ where: { id: commentId }, include: { post: { select: { authorId: true } } } });
  if (!comment || comment.deletedAt) throw notFound("Comment");
  const allowed = comment.userId === viewer.id || comment.post.authorId === viewer.id || isModerator(viewer);
  if (!allowed) throw forbidden("not_allowed", "You can only delete your own comments, or comments on your post.");
  // Soft delete: the database trigger lowers the comment count
  await prisma.postComment.update({ where: { id: comment.id }, data: { deletedAt: new Date() } });
  return { ok: true };
}
