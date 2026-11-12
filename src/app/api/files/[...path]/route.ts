import { notFound } from "@/server/errors";
import { route } from "@/server/http";
import { readLocalFile } from "@/server/lib/storage";

/** GET /api/files/2026/10/abc.jpg — photos stored on this computer (local storage only). */
export const GET = route<{ path: string[] | string }>(async (_req, { path }) => {
  const rel = Array.isArray(path) ? path.join("/") : path;
  const file = await readLocalFile(rel);
  if (!file) throw notFound("File");
  return new Response(new Uint8Array(file.bytes), {
    headers: { "content-type": file.contentType, "cache-control": "public, max-age=31536000, immutable" },
  });
});
