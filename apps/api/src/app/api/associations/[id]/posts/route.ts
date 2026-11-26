import { readQuery, route, uuid } from "@/server/http";
import { getViewer } from "@/server/auth/viewer";
import { orgPosts, pageQuery } from "@/server/services/posts.service";

/** GET /api/associations/:id/posts — official posts. */
export const GET = route<{ id: string }>(async (req, { id }) => orgPosts(await getViewer(req), uuid.parse(id), readQuery(req, pageQuery)));
