import { created, readJson, route, uuid } from "@/server/http";
import { getViewer, requireViewer } from "@/server/auth/viewer";
import { addLegacy, legacyInput, listLegacy } from "@/server/services/organizations.service";

type P = { id: string };

/** GET /api/associations/:id/legacy — Media / Legacy section (#66). */
export const GET = route<P>(async (req, { id }) => listLegacy(await getViewer(req), uuid.parse(id)));

/** POST /api/associations/:id/legacy — { recordType, title, year, body, winner, runnerUp, media } */
export const POST = route<P>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return created(await addLegacy(viewer, uuid.parse(id), await readJson(req, legacyInput)));
});
