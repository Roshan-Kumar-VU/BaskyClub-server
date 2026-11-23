import { route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { listCreatorRequests } from "@/server/services/badges.service";

/** GET /api/admin/badges/requests — open Creator badge requests, oldest first (Basky team). */
export const GET = route(async (req) => listCreatorRequests(await requireViewer(req)));
