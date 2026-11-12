import { readJson, route, uuid } from "@/server/http";
import { getViewer, requireViewer } from "@/server/auth/viewer";
import { deletePost, getPost, updatePost, updatePostInput } from "@/server/services/posts.service";

type P = { id: string };

/** GET /api/posts/:id — one post (also what a share link opens). */
export const GET = route<P>(async (req, { id }) => getPost(await getViewer(req), uuid.parse(id)));

/** PATCH /api/posts/:id — author edits the text. */
export const PATCH = route<P>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return updatePost(viewer, uuid.parse(id), await readJson(req, updatePostInput));
});

/** DELETE /api/posts/:id — author or moderator. */
export const DELETE = route<P>(async (req, { id }) => deletePost(await requireViewer(req), uuid.parse(id)));
