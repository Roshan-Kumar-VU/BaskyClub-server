import { readQuery, route, uuid } from "@/server/http";
import { getViewer } from "@/server/auth/viewer";
import { listMembers, listMembersQuery } from "@/server/services/memberships.service";

/** GET /api/clubs/:id/members — active members with position and roles. */
export const GET = route<{ id: string }>(async (req, { id }) =>
  listMembers(uuid.parse(id), await getViewer(req), readQuery(req, listMembersQuery)),
);
