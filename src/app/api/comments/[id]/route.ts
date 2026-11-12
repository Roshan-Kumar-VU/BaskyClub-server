import { route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { deleteComment } from "@/server/services/engagement.service";

/** DELETE /api/comments/:id — commenter, post author or moderator. */
export const DELETE = route<{ id: string }>(async (req, { id }) => deleteComment(await requireViewer(req), uuid.parse(id)));
