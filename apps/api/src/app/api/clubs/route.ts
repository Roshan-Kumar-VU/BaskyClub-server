import { created, readJson, readQuery, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { listClubs, listClubsQuery, registerClub, registerClubInput } from "@/server/services/clubs.service";

/** GET /api/clubs?districtCode=TN-VELLORE&kind=academy&q=... — approved clubs (anyone, no login needed). */
export const GET = route(async (req) => listClubs(readQuery(req, listClubsQuery)));

/** POST /api/clubs — register a club; it waits for BaskyCLub approval. */
export const POST = route(async (req) => {
  const viewer = await requireViewer(req);
  return created(await registerClub(viewer, await readJson(req, registerClubInput)));
});
