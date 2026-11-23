import { created, readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { grantOrgMember, grantOrgMemberInput, listOrgMembers } from "@/server/services/organizations.service";

type P = { id: string };

/** GET /api/associations/:id/members — staff: who has power in the app. */
export const GET = route<P>(async (req, { id }) => listOrgMembers(await requireViewer(req), uuid.parse(id)));

/** POST /api/associations/:id/members — { userId, accessLevel: owner | admin | member } */
export const POST = route<P>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return created(await grantOrgMember(viewer, uuid.parse(id), await readJson(req, grantOrgMemberInput)));
});
