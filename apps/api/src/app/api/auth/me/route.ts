import { readJson, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { me } from "@/server/services/auth.service";
import { updateMyProfile, updateProfileInput } from "@/server/services/profiles.service";

/** GET /api/auth/me — the logged-in person: profile, clubs, roles. */
export const GET = route(async (req) => me(await requireViewer(req)));

/** PATCH /api/auth/me — edit profile (name, bio, photos, links, district, pinned post). */
export const PATCH = route(async (req) => {
  const viewer = await requireViewer(req);
  return updateMyProfile(viewer, await readJson(req, updateProfileInput));
});
