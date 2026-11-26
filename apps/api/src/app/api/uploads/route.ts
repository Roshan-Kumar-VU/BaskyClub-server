import { created, route } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { uploadPhoto } from "@/server/services/uploads.service";

/** POST /api/uploads — upload one photo (form field "file") → { url, type, bytes }. */
export const POST = route(async (req) => created(await uploadPhoto(await requireViewer(req), req)));
