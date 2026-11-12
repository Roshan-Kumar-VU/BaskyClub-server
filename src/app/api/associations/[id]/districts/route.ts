import { readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { coverageInput, setCoverage } from "@/server/services/organizations.service";

/** PUT /api/associations/:id/districts — { districtCodes } Basky team sets which districts it covers. */
export const PUT = route<{ id: string }>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return setCoverage(viewer, uuid.parse(id), await readJson(req, coverageInput));
});
