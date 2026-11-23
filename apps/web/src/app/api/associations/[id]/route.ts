import { readJson, route, uuid } from "@/server/http";
import { getViewer, requireViewer } from "@/server/auth/viewer";
import { getOrg, updateOrg, updateOrgInput } from "@/server/services/organizations.service";

type P = { id: string };

/** GET /api/associations/:id — association page. */
export const GET = route<P>(async (req, { id }) => getOrg(await getViewer(req), uuid.parse(id)));

/** PATCH /api/associations/:id — staff edit details; Basky team changes pageStatus. */
export const PATCH = route<P>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return updateOrg(viewer, uuid.parse(id), await readJson(req, updateOrgInput));
});
