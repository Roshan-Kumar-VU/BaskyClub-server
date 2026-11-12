import { readJson, route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { deleteOfficeBearer, updateOfficeBearer, updateOfficeBearerInput } from "@/server/services/organizations.service";

type P = { id: string };

/** PATCH /api/office-bearers/:id — e.g. { termTo } to end a term. */
export const PATCH = route<P>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return updateOfficeBearer(viewer, uuid.parse(id), await readJson(req, updateOfficeBearerInput));
});

/** DELETE /api/office-bearers/:id — remove a wrong entry. */
export const DELETE = route<P>(async (req, { id }) => deleteOfficeBearer(await requireViewer(req), uuid.parse(id)));
