// Where uploaded photos are kept. STORAGE_DRIVER=local (default) saves them in ./uploads on this
// computer and serves them from /api/files/... — fine for testing on the Mac.
// For the live site this becomes Supabase Storage or AWS S3 (both speak the same S3 language);
// that driver is added once the hosting choice is made. Only this file changes.
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize, resolve } from "node:path";
import { env } from "../env";
import { FILES_PATH } from "./media";

export const IMAGE_TYPES = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
} as const;
export type ImageExt = keyof typeof IMAGE_TYPES;

function uploadRoot() {
  return resolve(process.env.UPLOAD_DIR ?? "uploads");
}

/** Checks the first bytes of the file, so a renamed .exe can't pretend to be a photo. */
export function detectImage(bytes: Uint8Array): ImageExt | null {
  const b = bytes;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "png";
  const ascii = (from: number, to: number) => Buffer.from(b.slice(from, to)).toString("ascii");
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "webp";
  if (ascii(4, 8) === "ftyp" && ["heic", "heix", "mif1", "msf1"].includes(ascii(8, 12))) return "heic";
  return null;
}

export async function saveImage(bytes: Uint8Array, ext: ImageExt): Promise<string> {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver !== "local") throw new Error(`STORAGE_DRIVER "${driver}" is not set up yet (only "local" for now).`);
  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const name = `${randomUUID()}.${ext}`;
  await mkdir(join(uploadRoot(), folder), { recursive: true });
  await writeFile(join(uploadRoot(), folder, name), bytes);
  return `${env.apiUrl}${FILES_PATH}${folder}/${name}`;
}

/** Reads a locally stored file; null if missing or the path tries to escape the uploads folder. */
export async function readLocalFile(relativePath: string): Promise<{ bytes: Buffer; contentType: string } | null> {
  const root = uploadRoot();
  const full = resolve(root, normalize(relativePath));
  if (!full.startsWith(root + "/") && !full.startsWith(root + "\\")) return null;
  const ext = extname(full).slice(1) as ImageExt;
  if (!(ext in IMAGE_TYPES)) return null;
  try {
    return { bytes: await readFile(full), contentType: IMAGE_TYPES[ext] };
  } catch {
    return null;
  }
}
