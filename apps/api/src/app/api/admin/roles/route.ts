import { created, readJson, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { grantPlatformRole, grantPlatformRoleInput, listPlatformRoles } from "@/server/services/admin.service";

/** GET /api/admin/roles — current BaskyCLub roles. */
export const GET = route(async (req) => listPlatformRoles(await requireViewer(req)));

/** POST /api/admin/roles — super admin: { userId, role: super_admin | basky_admin | moderator } */
export const POST = route(async (req) => {
  const viewer = await requireViewer(req);
  return created(await grantPlatformRole(viewer, await readJson(req, grantPlatformRoleInput)));
});
