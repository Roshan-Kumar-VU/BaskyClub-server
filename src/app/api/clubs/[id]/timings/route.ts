import { readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { setTimings, timingsInput } from "@/server/services/courts.service";

/** PUT /api/clubs/:id/timings — { timings: [{ dayOfWeek: 1..7, morningStart, morningEnd, eveningStart, eveningEnd, isFullDay }] } */
export const PUT = route<{ id: string }>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return setTimings(viewer, uuid.parse(id), await readJson(req, timingsInput));
});
