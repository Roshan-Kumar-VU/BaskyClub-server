import { readJson, route, uuid } from "@/server/http";
import { getViewer, requireViewer } from "@/server/auth/viewer";
import { deleteCourt, getCourt, updateCourt, updateCourtInput } from "@/server/services/courts.service";

type P = { id: string };

/** GET /api/courts/:id */
export const GET = route<P>(async (req, { id }) => getCourt(await getViewer(req), uuid.parse(id)));

/** PATCH /api/courts/:id — club staff, Basky team, or whoever suggested it (while pending). */
export const PATCH = route<P>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return updateCourt(viewer, uuid.parse(id), await readJson(req, updateCourtInput));
});

/** DELETE /api/courts/:id */
export const DELETE = route<P>(async (req, { id }) => deleteCourt(await requireViewer(req), uuid.parse(id)));
