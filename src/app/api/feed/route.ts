import { readQuery, route } from "@/server/http";
import { getViewer } from "@/server/auth/viewer";
import { feed, feedQuery } from "@/server/services/posts.service";

/** GET /api/feed?scope=all|district|following&districtCode=TN-VELLORE&cursor=... */
export const GET = route(async (req) => feed(await getViewer(req), readQuery(req, feedQuery)));
