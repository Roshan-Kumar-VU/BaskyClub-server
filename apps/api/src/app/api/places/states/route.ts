import { route } from "@/server/http";
import { listStates } from "@/server/services/places.service";

/** GET /api/places/states */
export const GET = route(async () => listStates());
