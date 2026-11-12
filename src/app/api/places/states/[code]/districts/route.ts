import { route } from "@/server/http";
import { listDistricts } from "@/server/services/places.service";

/** GET /api/places/states/TN/districts */
export const GET = route<{ code: string }>(async (_req, { code }) => listDistricts(code));
