import { readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { reviewClub, reviewClubInput } from "@/server/services/clubs.service";

/** POST /api/clubs/:id/review — Basky team: { decision: "approve" | "suspend" | "reinstate" }. */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return reviewClub(viewer, uuid.parse(id), await readJson(req, reviewClubInput));
});
