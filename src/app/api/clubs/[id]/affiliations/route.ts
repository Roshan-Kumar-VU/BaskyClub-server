import { created, readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { clubRequest, clubRequestInput, listClubAffiliations } from "@/server/services/affiliations.service";

type P = { id: string };

/** GET /api/clubs/:id/affiliations — club staff. */
export const GET = route<P>(async (req, { id }) => listClubAffiliations(await requireViewer(req), uuid.parse(id)));

/** POST /api/clubs/:id/affiliations — ask to affiliate { organizationId, tnbaNumber? } */
export const POST = route<P>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return created(await clubRequest(viewer, uuid.parse(id), await readJson(req, clubRequestInput)));
});
