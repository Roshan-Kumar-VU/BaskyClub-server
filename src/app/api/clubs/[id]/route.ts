import { readJson, route, uuid } from "@/server/http";
import { getViewer, requireViewer } from "@/server/auth/viewer";
import { getClub, updateClub, updateClubInput } from "@/server/services/clubs.service";

type P = { id: string };

/** GET /api/clubs/:id — club page. */
export const GET = route<P>(async (req, { id }) => getClub(await getViewer(req), uuid.parse(id)));

/** PATCH /api/clubs/:id — edit details (owner, admins, Basky team). */
export const PATCH = route<P>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return updateClub(viewer, uuid.parse(id), await readJson(req, updateClubInput));
});
