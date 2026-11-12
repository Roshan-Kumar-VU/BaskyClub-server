import { readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { deleteLegacy, updateLegacy, updateLegacyInput } from "@/server/services/organizations.service";

type P = { id: string };

/** PATCH /api/legacy/:id */
export const PATCH = route<P>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return updateLegacy(viewer, uuid.parse(id), await readJson(req, updateLegacyInput));
});

/** DELETE /api/legacy/:id */
export const DELETE = route<P>(async (req, { id }) => deleteLegacy(await requireViewer(req), uuid.parse(id)));
