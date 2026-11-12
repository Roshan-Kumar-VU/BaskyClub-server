import { created, readJson, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { report, reportInput } from "@/server/services/moderation.service";

/** POST /api/reports — { targetType: "post" | "comment" | "user", targetId, reason } */
export const POST = route(async (req) => {
  const viewer = await requireViewer(req);
  return created(await report(viewer, await readJson(req, reportInput)));
});
