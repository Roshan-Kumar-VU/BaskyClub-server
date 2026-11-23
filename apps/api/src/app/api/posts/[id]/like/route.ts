import { route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { likePost, unlikePost } from "@/server/services/engagement.service";

type P = { id: string };

/** POST /api/posts/:id/like */
export const POST = route<P>(async (req, { id }) => likePost(await requireViewer(req), uuid.parse(id)));

/** DELETE /api/posts/:id/like */
export const DELETE = route<P>(async (req, { id }) => unlikePost(await requireViewer(req), uuid.parse(id)));
