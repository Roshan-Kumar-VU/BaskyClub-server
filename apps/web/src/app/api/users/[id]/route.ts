import { route, uuid } from "@/server/http";
import { getViewer } from "@/server/auth/viewer";
import { getProfile } from "@/server/services/profiles.service";

/** GET /api/users/:id — profile page (#72). */
export const GET = route<{ id: string }>(async (req, { id }) => getProfile(await getViewer(req), uuid.parse(id)));
