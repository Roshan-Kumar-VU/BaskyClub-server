import { readQuery, route } from "@/server/http";
import { map, mapQuery } from "@/server/services/courts.service";

/** GET /api/map?lat=12.92&lng=79.13&radiusKm=25 (or ?districtCode=TN-VELLORE) — clubs + courts for the map. */
export const GET = route(async (req) => map(readQuery(req, mapQuery)));
