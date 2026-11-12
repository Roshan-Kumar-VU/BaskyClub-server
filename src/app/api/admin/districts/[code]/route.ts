import { readJson, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { updateDistrict, updateDistrictInput } from "@/server/services/admin.service";

/** PATCH /api/admin/districts/TN-VELLORE — { zoneCode, altName, isProvisional } */
export const PATCH = route<{ code: string }>(async (req, { code }) => {
  const viewer = await requireViewer(req);
  return updateDistrict(viewer, code, await readJson(req, updateDistrictInput));
});
