import { route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { leaveClub } from "@/server/services/memberships.service";

/** POST /api/clubs/:id/leave */
export const POST = route<{ id: string }>(async (req, { id }) => leaveClub(await requireViewer(req), uuid.parse(id)));
