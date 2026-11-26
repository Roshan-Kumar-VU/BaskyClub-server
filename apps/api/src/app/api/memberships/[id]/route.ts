import { readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { removeMember, updateMember, updateMemberInput } from "@/server/services/memberships.service";

type P = { id: string };

/** PATCH /api/memberships/:id — player ticked, position (member or staff); coach/referee (staff). */
export const PATCH = route<P>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return updateMember(viewer, uuid.parse(id), await readJson(req, updateMemberInput));
});

/** DELETE /api/memberships/:id — club staff remove a member. */
export const DELETE = route<P>(async (req, { id }) => removeMember(await requireViewer(req), uuid.parse(id)));
