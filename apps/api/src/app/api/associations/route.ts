import { created, readJson, readQuery, route } from "@/server/http";
import { getViewer, requireViewer } from "@/server/auth/viewer";
import { createOrg, createOrgInput, listOrgs, listOrgsQuery } from "@/server/services/organizations.service";

/** GET /api/associations?level=district&stateCode=TN&q= */
export const GET = route(async (req) => listOrgs(await getViewer(req), readQuery(req, listOrgsQuery)));

/** POST /api/associations — Basky team creates an association (starts as draft). */
export const POST = route(async (req) => {
  const viewer = await requireViewer(req);
  return created(await createOrg(viewer, await readJson(req, createOrgInput)));
});
