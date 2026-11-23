import { route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { revokeBadge } from "@/server/services/badges.service";

/** DELETE /api/admin/badges/:id — take a badge away. */
export const DELETE = route<{ id: string }>(async (req, { id }) => revokeBadge(await requireViewer(req), uuid.parse(id)));
