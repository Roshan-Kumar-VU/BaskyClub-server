import { readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { decideAffiliation, decideAffiliationInput } from "@/server/services/affiliations.service";

/** POST /api/affiliations/:id/decide — { decision: approve | reject, validFrom?, validUntil?, tnbaNumber? } */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return decideAffiliation(viewer, uuid.parse(id), await readJson(req, decideAffiliationInput));
});
