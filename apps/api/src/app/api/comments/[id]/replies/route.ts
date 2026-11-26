import { readQuery, route, uuid } from "@/server/http";
import { getViewer } from "@/server/auth/viewer";
import { commentsQuery, listReplies } from "@/server/services/engagement.service";

/** GET /api/comments/:id/replies — "View N replies". */
export const GET = route<{ id: string }>(async (req, { id }) =>
  listReplies(await getViewer(req), uuid.parse(id), readQuery(req, commentsQuery)),
);
