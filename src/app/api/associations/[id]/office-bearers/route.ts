import { created, readJson, route, uuid } from "@/server/http";
import { getViewer, requireViewer } from "@/server/auth/viewer";
import { addOfficeBearer, listOfficeBearers, officeBearerInput } from "@/server/services/organizations.service";

type P = { id: string };

/** GET /api/associations/:id/office-bearers?past=1 — current (and past) office bearers. */
export const GET = route<P>(async (req, { id }) =>
  listOfficeBearers(await getViewer(req), uuid.parse(id), new URL(req.url).searchParams.get("past") === "1"),
);

/** POST /api/associations/:id/office-bearers — { name, designation, termFrom, termTo?, userId?, photoUrl?, sortOrder } */
export const POST = route<P>(async (req, { id }) => {
  const viewer = await requireViewer(req);
  return created(await addOfficeBearer(viewer, uuid.parse(id), await readJson(req, officeBearerInput)));
});
