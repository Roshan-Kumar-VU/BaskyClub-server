import { created, readJson, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { createPost, createPostInput } from "@/server/services/posts.service";

/** POST /api/posts — { content, clubId?, visibility, images: [{url}], youtubeUrl? } */
export const POST = route(async (req) => {
  const viewer = await requireViewer(req);
  return created(await createPost(viewer, await readJson(req, createPostInput)));
});
