import { route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { endOrgMember } from "@/server/services/organizations.service";

/** DELETE /api/organization-members/:id — end an association role (kept as history). */
export const DELETE = route<{ id: string }>(async (req, { id }) => endOrgMember(await requireViewer(req), uuid.parse(id)));
