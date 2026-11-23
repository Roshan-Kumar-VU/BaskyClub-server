import { readQuery, route, uuid } from "@/server/http";
import { getViewer } from "@/server/auth/viewer";
import { clubPosts, pageQuery } from "@/server/services/posts.service";

/** GET /api/clubs/:id/posts — club page posts (members also see members-only posts). */
export const GET = route<{ id: string }>(async (req, { id }) => clubPosts(await getViewer(req), uuid.parse(id), readQuery(req, pageQuery)));
