import { readQuery, route, uuid } from "@/server/http";
import { getViewer } from "@/server/auth/viewer";
import { pageQuery, userPosts } from "@/server/services/posts.service";

/** GET /api/users/:id/posts — posts on a profile. */
export const GET = route<{ id: string }>(async (req, { id }) => userPosts(await getViewer(req), uuid.parse(id), readQuery(req, pageQuery)));
