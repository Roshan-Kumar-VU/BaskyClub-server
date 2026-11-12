import { created, readJson, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { addCourt, courtInput } from "@/server/services/courts.service";

/** POST /api/courts — suggest a court (waits for Basky team approval). */
export const POST = route(async (req) => {
  const viewer = await requireViewer(req);
  return created(await addCourt(viewer, await readJson(req, courtInput)));
});
