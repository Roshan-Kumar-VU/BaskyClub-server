import { readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { transferOwnership, transferOwnershipInput } from "@/server/services/club-roles.service";

/** POST /api/clubs/:id/transfer-ownership — { newOwnerUserId, keepAsAdmin }. */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return transferOwnership(viewer, uuid.parse(id), await readJson(req, transferOwnershipInput));
});
