import { route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { endRole } from "@/server/services/club-roles.service";

/** DELETE /api/club-roles/:id — end an admin/captain role (kept as history). */
export const DELETE = route<{ id: string }>(async (req, { id }) => endRole(await requireViewer(req), uuid.parse(id)));
