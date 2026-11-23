// Review queue (#25, #41): posts from people without a club, user reports, later AI flags.
// Moderators decide: approve (publish / dismiss) or remove. Every decision is logged.
import { z } from "zod";
import { prisma } from "../db";
import { badRequest, notFound } from "../errors";
import { uuid } from "../http";
import { requireActive, type Viewer } from "../auth/viewer";
import { logChange, requireModerator } from "../permissions";

export const reportInput = z.object({
  targetType: z.enum(["post", "comment", "user"]),
  targetId: uuid,
  reason: z.string().trim().min(3, "Tell us briefly what's wrong.").max(500),
});
export const casesQuery = z.object({
  status: z.enum(["open", "approved", "removed"]).default("open"),
  source: z.enum(["ai", "report", "no_club_review"]).optional(),
});
export const decideInput = z.object({
  decision: z.enum(["approve", "remove"]),
  note: z.string().trim().max(500).optional(),
});

// ---- Anyone logged in: report something ------------------------------------------------

export async function report(viewer: Viewer, input: z.infer<typeof reportInput>) {
  requireActive(viewer);
  const exists =
    input.targetType === "post"
      ? await prisma.post.findFirst({ where: { id: input.targetId, deletedAt: null } })
      : input.targetType === "comment"
        ? await prisma.postComment.findFirst({ where: { id: input.targetId, deletedAt: null } })
        : await prisma.user.findFirst({ where: { id: input.targetId, status: { not: "deleted" } } });
  if (!exists) throw notFound("Item");

  // One open report per person per item is enough
  const already = await prisma.moderationCase.findFirst({
    where: { targetType: input.targetType, targetId: input.targetId, reportedById: viewer.id, status: "open" },
  });
  if (already) return { ok: true, caseId: already.id };

  const created = await prisma.moderationCase.create({
    data: { targetType: input.targetType, targetId: input.targetId, source: "report", reason: input.reason, reportedById: viewer.id },
  });
  return { ok: true, caseId: created.id };
}

// ---- Moderators -------------------------------------------------------------------------------

export async function listCases(viewer: Viewer, query: z.infer<typeof casesQuery>) {
  requireModerator(viewer);
  const cases = await prisma.moderationCase.findMany({
    where: { status: query.status, ...(query.source ? { source: query.source } : {}) },
    orderBy: { createdAt: "asc" },
    take: 100,
    include: { reportedBy: { select: { id: true, name: true } }, reviewedBy: { select: { id: true, name: true } } },
  });

  // Attach a preview of what each case is about
  const ids = (t: string) => cases.filter((c) => c.targetType === t).map((c) => c.targetId);
  const [posts, comments, users] = await Promise.all([
    prisma.post.findMany({
      where: { id: { in: ids("post") } },
      select: { id: true, content: true, moderationStatus: true, visibility: true, author: { select: { id: true, name: true } }, media: { select: { mediaType: true, url: true } } },
    }),
    prisma.postComment.findMany({
      where: { id: { in: ids("comment") } },
      select: { id: true, content: true, postId: true, moderationStatus: true, user: { select: { id: true, name: true } } },
    }),
    prisma.user.findMany({ where: { id: { in: ids("user") } }, select: { id: true, name: true, status: true } }),
  ]);
  const byId = new Map<string, unknown>([...posts, ...comments, ...users].map((x) => [x.id, x]));
  return { cases: cases.map((c) => ({ ...c, aiScore: c.aiScore?.toNumber() ?? null, target: byId.get(c.targetId) ?? null })) };
}

export async function decideCase(viewer: Viewer, caseId: string, input: z.infer<typeof decideInput>) {
  requireModerator(viewer);
  const c = await prisma.moderationCase.findUnique({ where: { id: caseId } });
  if (!c) throw notFound("Case");
  if (c.status !== "open") throw badRequest("already_decided", "This case has already been decided.");
  if (c.targetType === "user" && input.decision === "remove") {
    throw badRequest("use_admin_tools", "Suspending accounts is done by the BaskyCLub team in user management.");
  }

  const now = new Date();
  const status = input.decision === "approve" ? "approved" : "removed";
  await prisma.$transaction(async (tx) => {
    if (c.targetType === "post") {
      const post = await tx.post.findUnique({ where: { id: c.targetId } });
      if (post) {
        const next = input.decision === "approve" ? "published" : "removed";
        // A post published from review goes live now, so it shows at the top of the feed (the feed is
        // newest first). When it was first sent stays on the case (moderation_cases.created_at).
        // A reported post that is kept was already live, so its time doesn't change.
        const goesLiveNow = next === "published" && post.moderationStatus === "in_review";
        await tx.post.update({ where: { id: post.id }, data: { moderationStatus: next, ...(goesLiveNow ? { createdAt: new Date() } : {}) } });
        if (next === "removed") await tx.user.updateMany({ where: { pinnedPostId: post.id }, data: { pinnedPostId: null } });
        await logChange(tx, viewer.id, "posts", post.id, "update", { moderationStatus: post.moderationStatus }, { moderationStatus: next, note: input.note ?? null });
      }
    } else if (c.targetType === "comment" && input.decision === "remove") {
      // Removed comments also get deleted_at, so the comment count drops and "Comment removed" shows
      await tx.postComment.update({ where: { id: c.targetId }, data: { moderationStatus: "removed", deletedAt: now } });
      await logChange(tx, viewer.id, "post_comments", c.targetId, "update", null, { moderationStatus: "removed", note: input.note ?? null });
    }
    // Close every open case about the same item (several people may have reported it)
    await tx.moderationCase.updateMany({
      where: { targetType: c.targetType, targetId: c.targetId, status: "open" },
      data: { status, reviewedById: viewer.id, reviewedAt: now, note: input.note },
    });
  });
  return { ok: true, status };
}
