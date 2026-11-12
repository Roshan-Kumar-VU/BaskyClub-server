import { created, readJson, readQuery, route, uuid } from "@/server/http";
import { getViewer, requireViewer } from "@/server/auth/viewer";
import { addComment, commentsQuery, createCommentInput, listComments } from "@/server/services/engagement.service";

type P = { id: string };

/** GET /api/posts/:id/comments?cursor= — top-level comments, 20 at a time. */
export const GET = route<P>(async (req, { id }) => listComments(await getViewer(req), uuid.parse(id), readQuery(req, commentsQuery)));

/** POST /api/posts/:id/comments — { content, parentId? } */
export const POST = route<P>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return created(await addComment(viewer, uuid.parse(id), await readJson(req, createCommentInput)));
});
