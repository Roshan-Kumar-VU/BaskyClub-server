import { route } from "@/server/http";
import { allPlaces } from "@/server/services/places.service";

/** GET /api/places — all states (with district counts) and all districts. */
export const GET = route(async () => allPlaces());
