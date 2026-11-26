import { z } from "zod";
import { route, uuid } from "@/server/http";
import { requireViewer } from "@/server/auth/viewer";
import { requireBaskyTeam } from "@/server/permissions";
import { IMPORT_KINDS, importOfficialData, importTemplate, readUpload } from "@/server/services/imports.service";

type P = { id: string; kind: string };
const kindOf = (kind: string) => z.enum(IMPORT_KINDS, { message: "Use office-bearers or legacy." }).parse(kind);

/** GET /api/associations/:id/import/:kind — an empty CSV template (header + example row). Basky team. */
export const GET = route<P>(async (req, { id, kind }) => {
  requireBaskyTeam(await requireViewer(req));
  uuid.parse(id);
  return importTemplate(kindOf(kind));
});

/** POST /api/associations/:id/import/:kind — form data: file (CSV), dryRun=1 for a report only. Basky team. */
export const POST = route<P>(async (req, { id, kind }) => {
  const viewer = await requireViewer(req);
  return importOfficialData(viewer, uuid.parse(id), kindOf(kind), await readUpload(req));
});
