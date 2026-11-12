import { readJson, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { changePassword, changePasswordInput } from "@/server/services/auth.service";

/** POST /api/auth/change-password */
export const POST = route(async (req) => {
  const viewer = await requireViewer(req);
  return changePassword(viewer, await readJson(req, changePasswordInput));
});
