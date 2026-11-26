import { created, readJson, readQuery, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { listAffiliationsQuery, listOrgAffiliations, orgInvite, orgInviteInput } from "@/server/services/affiliations.service";

type P = { id: string };

/** GET /api/associations/:id/affiliations?status=pending — association staff. */
export const GET = route<P>(async (req, { id }) =>
  listOrgAffiliations(await requireViewer(req), uuid.parse(id), readQuery(req, listAffiliationsQuery)),
);

/** POST /api/associations/:id/affiliations — invite a club { clubId, tnbaNumber?, validFrom?, validUntil? } */
export const POST = route<P>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return created(await orgInvite(viewer, uuid.parse(id), await readJson(req, orgInviteInput)));
});
