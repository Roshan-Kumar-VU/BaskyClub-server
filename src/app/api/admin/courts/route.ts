import { route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { pendingCourts } from "@/server/services/courts.service";

/** GET /api/admin/courts — courts waiting for approval. */
export const GET = route(async (req) => pendingCourts(await requireViewer(req)));
