import { readJson, readQuery, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { follow, followInput, myFollows, unfollow } from "@/server/services/follows.service";

/** GET /api/follows — what I follow. */
export const GET = route(async (req) => myFollows(await requireViewer(req)));

/** POST /api/follows — { targetType: "club" | "organization" | "user", targetId } */
export const POST = route(async (req) => {
  const viewer = await requireViewer(req);
  return follow(viewer, await readJson(req, followInput));
});

/** DELETE /api/follows?targetType=club&targetId=... */
export const DELETE = route(async (req) => unfollow(await requireViewer(req), readQuery(req, followInput)));
