import { route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { endPlatformRole } from "@/server/services/admin.service";

/** DELETE /api/admin/roles/:id — super admin ends a BaskyCLub role. */
export const DELETE = route<{ id: string }>(async (req, { id }) => endPlatformRole(await requireViewer(req), uuid.parse(id)));
