import { readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { reviewCourt, reviewCourtInput } from "@/server/services/courts.service";

/** POST /api/courts/:id/review — Basky team: { decision: approve | reject } */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return reviewCourt(viewer, uuid.parse(id), await readJson(req, reviewCourtInput));
});
