import { readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { setStatusInput, setUserStatus } from "@/server/services/admin.service";

/** POST /api/admin/users/:id/status — { status: suspended | active, reason } */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return setUserStatus(viewer, uuid.parse(id), await readJson(req, setStatusInput));
});
