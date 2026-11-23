import { readJson, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { updateZone, updateZoneInput } from "@/server/services/admin.service";

/** PATCH /api/admin/zones/TN-Z-CHN — { name, hqDistrictCode, isProvisional } */
export const PATCH = route<{ code: string }>(async (req, { code }) => {
  const viewer = await requireViewer(req);
  return updateZone(viewer, code, await readJson(req, updateZoneInput));
});
