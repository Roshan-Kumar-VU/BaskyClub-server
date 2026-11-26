import { z } from "zod";
import { env } from "../env";

/** Path where photos uploaded to this server are served (local storage). */
export const FILES_PATH = "/api/files/";

/**
 * A photo link we accept: any https link (e.g. Supabase Storage, S3, a CDN),
 * or a photo uploaded to this server (http://localhost:3000/api/files/... while testing).
 */
export const mediaUrl = z
  .string()
  .trim()
  .refine((s) => {
    try {
      const u = new URL(s);
      return u.protocol === "https:" || s.startsWith(`${env.apiUrl}${FILES_PATH}`);
    } catch {
      return false;
    }
  }, "Use an https:// link or upload the photo first.");
