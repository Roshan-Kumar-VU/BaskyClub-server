import { created, readJson, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { giveBadge, giveBadgeInput, listBadges } from "@/server/services/badges.service";

/** GET /api/admin/badges — active badges (Basky team). */
export const GET = route(async (req) => listBadges(await requireViewer(req)));

/** POST /api/admin/badges — { badge: basky_verified, clubId } or { badge: creator, userId } */
export const POST = route(async (req) => {
  const viewer = await requireViewer(req);
  return created(await giveBadge(viewer, await readJson(req, giveBadgeInput)));
});
