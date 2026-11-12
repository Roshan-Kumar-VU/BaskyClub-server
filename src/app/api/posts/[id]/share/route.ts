import { route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { sharePost } from "@/server/services/posts.service";

/** POST /api/posts/:id/share — counts a share, returns the link. */
export const POST = route<{ id: string }>(async (req, { id }) => sharePost(await requireViewer(req), uuid.parse(id)));
