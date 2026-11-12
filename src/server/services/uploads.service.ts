// Photo upload: the app sends the photo here first, gets back a link, then uses that link in a
// post, profile, club logo, office bearer photo or legacy record.
import { badRequest } from "../errors";
import { requireActive, type Viewer } from "../auth/viewer";
import { limitRate } from "../lib/rate-limit";
import { detectImage, saveImage } from "../lib/storage";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const PER_HOUR = 60;

// Uploads are counted in memory per server (no table for them); enough to stop runaway loops.
const recent = new Map<string, number[]>();

export async function uploadPhoto(viewer: Viewer, req: Request) {
  requireActive(viewer);
  await limitRate(
    async (since) => (recent.get(viewer.id) ?? []).filter((t) => t >= since.getTime()).length,
    PER_HOUR,
    3600,
    "uploading",
  );

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw badRequest("no_file", "Send the photo as form data in a field called \"file\".");
  }
  const file = form.get("file");
  if (!(file instanceof Blob)) throw badRequest("no_file", "Send the photo as form data in a field called \"file\".");
  if (file.size === 0) throw badRequest("empty_file", "The photo is empty.");
  if (file.size > MAX_BYTES) throw badRequest("too_big", "Photos can be up to 10 MB.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = detectImage(bytes);
  if (!ext) throw badRequest("not_a_photo", "Only JPG, PNG, WEBP or HEIC photos can be uploaded.");

  const url = await saveImage(bytes, ext);
  recent.set(viewer.id, [...(recent.get(viewer.id) ?? []), Date.now()].slice(-PER_HOUR));
  return { url, type: ext, bytes: file.size };
}
