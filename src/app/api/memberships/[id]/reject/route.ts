import { route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { decideRequest } from "@/server/services/memberships.service";

/** POST /api/memberships/:id/reject — club staff decline a join request. */
export const POST = route<{ id: string }>(async (req, { id }) =>
  decideRequest(await requireViewer(req), uuid.parse(id), "reject"),
);
