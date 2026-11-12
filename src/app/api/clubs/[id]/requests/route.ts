import { route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { listJoinRequests } from "@/server/services/memberships.service";

/** GET /api/clubs/:id/requests — club staff: pending join requests. */
export const GET = route<{ id: string }>(async (req, { id }) => listJoinRequests(await requireViewer(req), uuid.parse(id)));
