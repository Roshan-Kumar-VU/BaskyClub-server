import { readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { decideCreatorInput, decideCreatorRequest } from "@/server/services/badges.service";

/** POST /api/admin/badges/requests/:id/decide — { decision: approve | decline, note? } (note needed to decline). */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return decideCreatorRequest(viewer, uuid.parse(id), await readJson(req, decideCreatorInput));
});
