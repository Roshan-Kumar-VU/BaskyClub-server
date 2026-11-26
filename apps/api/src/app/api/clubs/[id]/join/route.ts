import { created, readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { cancelRequest, joinInput, requestToJoin } from "@/server/services/memberships.service";

type P = { id: string };

/** POST /api/clubs/:id/join — ask to join (creates a pending membership). */
export const POST = route<P>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return created(await requestToJoin(viewer, uuid.parse(id), await readJson(req, joinInput)));
});

/** DELETE /api/clubs/:id/join — withdraw your pending request. */
export const DELETE = route<P>(async (req, { id }) => cancelRequest(await requireViewer(req), uuid.parse(id)));
