import { readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { decideCase, decideInput } from "@/server/services/moderation.service";

/** POST /api/moderation/cases/:id/decide — { decision: "approve" | "remove", note? } */
export const POST = route<{ id: string }>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return decideCase(viewer, uuid.parse(id), await readJson(req, decideInput));
});
