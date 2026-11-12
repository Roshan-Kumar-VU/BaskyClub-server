import { created, readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { grantRole, grantRoleInput } from "@/server/services/club-roles.service";

/** POST /api/clubs/:id/roles — { userId, role: "admin" | "captain" }. */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return created(await grantRole(viewer, uuid.parse(id), await readJson(req, grantRoleInput)));
});
