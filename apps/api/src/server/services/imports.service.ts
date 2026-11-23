// Bulk upload of an association's official data from a spreadsheet (PRD §6, §2: Basky admin).
// The Basky team fills a sheet, downloads it as CSV and uploads it here, usually while the
// association page is still a draft. Two kinds:
//   office-bearers — name, designation, term_from, [term_to], [sort_order], [photo_url]
//   legacy         — record_type, title, [year], [story], [winner], [runner_up], [photo_urls], [youtube_url]
//
// Every row is checked with the same rules as adding one by hand (organizations.service).
// dryRun → a report only. Otherwise nothing is saved unless every row is fine: no half-imports.
// Rows already on the page (or twice in the file) are refused, so uploading the same file
// again can't create copies.
import { z } from "zod";
import { prisma } from "../db";
import { AppError, badRequest, notFound } from "../errors";
import { requireBaskyTeam, logChange } from "../permissions";
import type { Viewer } from "../auth/viewer";
import { CsvError, normalizeDate, readTable } from "../lib/csv";
import { checkLegacyMedia, legacyInput, officeBearerInput } from "./organizations.service";

export const IMPORT_KINDS = ["office-bearers", "legacy"] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];

const MAX_ROWS = 500;
const MAX_BYTES = 1024 * 1024;
const PREVIEW_ROWS = 10;

const COLUMNS = {
  "office-bearers": {
    required: ["name", "designation", "term_from"],
    optional: ["term_to", "sort_order", "photo_url"],
    example: ["Mr. S. Rajendran", "President", "01/04/2024", "", "1", ""],
  },
  legacy: {
    required: ["record_type", "title"],
    optional: ["year", "story", "winner", "runner_up", "photo_urls", "youtube_url"],
    example: ["tournament_record", "District Championship — men", "2023", "Played at the fort court", "Vellore Hoopers", "Katpadi Ballers", "", ""],
  },
} as const;

export interface RowError {
  line: number;
  field: string;
  message: string;
}

/** An empty template to fill in: the header row and one example row. */
export function importTemplate(kind: ImportKind): Response {
  const c = COLUMNS[kind];
  const quote = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const csv = `${[...c.required, ...c.optional].join(",")}\r\n${c.example.map(quote).join(",")}\r\n`;
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="baskyclub-${kind}-template.csv"`,
    },
  });
}

/** Reads the uploaded file (form field "file") and the dryRun flag. */
export async function readUpload(req: Request): Promise<{ text: string; dryRun: boolean }> {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw badRequest("no_file", 'Send the spreadsheet (CSV) as form data in a field called "file".');
  }
  const file = form.get("file");
  if (!(file instanceof Blob)) throw badRequest("no_file", 'Send the spreadsheet (CSV) as form data in a field called "file".');
  if (file.size === 0) throw badRequest("empty_file", "The file is empty.");
  if (file.size > MAX_BYTES) throw badRequest("too_big", "The file can be up to 1 MB. Split it into smaller files.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw badRequest("not_utf8", 'Save the spreadsheet as "CSV UTF-8" and upload it again.');
  }
  const flag = String(form.get("dryRun") ?? "").toLowerCase();
  return { text, dryRun: flag === "1" || flag === "true" };
}

export async function importOfficialData(viewer: Viewer, organizationId: string, kind: ImportKind, upload: { text: string; dryRun: boolean }) {
  requireBaskyTeam(viewer);
  const org = await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } });
  if (!org) throw notFound("Association");

  let rows: { line: number; values: Record<string, string> }[];
  try {
    rows = readTable(upload.text, COLUMNS[kind], MAX_ROWS).rows;
  } catch (err) {
    if (err instanceof CsvError) throw badRequest("bad_file", err.message);
    throw err;
  }

  const checked = kind === "office-bearers" ? await checkBearers(organizationId, rows) : await checkLegacy(organizationId, rows);
  const report = {
    kind,
    dryRun: upload.dryRun,
    total: rows.length,
    valid: checked.valid.length,
    errors: checked.errors,
    preview: checked.valid.slice(0, PREVIEW_ROWS).map((v) => v.preview),
  };
  if (upload.dryRun) return { ...report, created: 0 };
  if (checked.errors.length) {
    const bad = new Set(checked.errors.map((e) => e.line)).size;
    throw new AppError(400, "fix_rows", `${bad} row${bad === 1 ? " has" : "s have"} problems. Nothing was saved.`, checked.errors);
  }

  await prisma.$transaction(async (tx) => {
    if (kind === "office-bearers") {
      await tx.officeBearer.createMany({
        data: checked.valid.map((v) => ({ ...(v.data as z.infer<typeof officeBearerInput>), organizationId, enteredById: viewer.id })),
      });
    } else {
      for (const v of checked.valid) {
        const { media, ...data } = v.data as z.infer<typeof legacyInput> & { media: { mediaType: string; url: string; sortOrder: number }[] };
        await tx.legacyRecord.create({ data: { ...data, organizationId, createdById: viewer.id, media: { create: media } } });
      }
    }
    await logChange(tx, viewer.id, kind === "office-bearers" ? "office_bearers" : "legacy_records", organizationId, "create", null, {
      imported: checked.valid.length,
      from: "spreadsheet",
    });
  });
  return { ...report, created: checked.valid.length };
}

// ---- Row checks -----------------------------------------------------------------------------------

type Checked = { valid: { line: number; data: unknown; preview: Record<string, unknown> }[]; errors: RowError[] };

const blankToNull = (s: string | undefined) => (s && s.trim() !== "" ? s.trim() : null);
const key = (...parts: (string | number | null | undefined)[]) => parts.map((p) => String(p ?? "").trim().toLowerCase()).join("|");

/** Zod issues → row errors, with the spreadsheet's column names. */
function zodErrors(line: number, err: z.ZodError, columnOf: Record<string, string>): RowError[] {
  return err.issues.map((i) => {
    const path = String(i.path[0] ?? "");
    return { line, field: columnOf[path] ?? path, message: i.message };
  });
}

/** Spreadsheet date → "YYYY-MM-DD" for the shared date rule; unknown shapes are passed on to fail there. */
const sheetDate = (s: string | undefined) => {
  const v = blankToNull(s);
  return v === null ? null : (normalizeDate(v) ?? v);
};

async function checkBearers(organizationId: string, rows: { line: number; values: Record<string, string> }[]): Promise<Checked> {
  const existing = await prisma.officeBearer.findMany({ where: { organizationId }, select: { name: true, designation: true, termFrom: true } });
  const seen = new Set(existing.map((b) => key(b.name, b.designation, b.termFrom.toISOString().slice(0, 10))));
  const out: Checked = { valid: [], errors: [] };
  const columnOf = { name: "name", designation: "designation", termFrom: "term_from", termTo: "term_to", sortOrder: "sort_order", photoUrl: "photo_url" };

  for (const { line, values } of rows) {
    const sortOrder = blankToNull(values.sort_order);
    const raw = {
      name: values.name,
      designation: values.designation,
      termFrom: sheetDate(values.term_from) ?? "",
      termTo: sheetDate(values.term_to),
      sortOrder: sortOrder === null ? undefined : /^\d+$/.test(sortOrder) ? Number(sortOrder) : sortOrder,
      photoUrl: blankToNull(values.photo_url),
    };
    const parsed = officeBearerInput.safeParse(raw);
    if (!parsed.success) {
      out.errors.push(...zodErrors(line, parsed.error, columnOf));
      continue;
    }
    const b = parsed.data;
    if (b.termTo && b.termTo < b.termFrom) {
      out.errors.push({ line, field: "term_to", message: "The term can't end before it starts." });
      continue;
    }
    const k = key(b.name, b.designation, b.termFrom.toISOString().slice(0, 10));
    if (seen.has(k)) {
      out.errors.push({ line, field: "name", message: "This office bearer (same name, designation and start) is already there." });
      continue;
    }
    seen.add(k);
    out.valid.push({
      line,
      data: b,
      preview: { line, name: b.name, designation: b.designation, termFrom: b.termFrom.toISOString().slice(0, 10), termTo: b.termTo ? b.termTo.toISOString().slice(0, 10) : null },
    });
  }
  return out;
}

async function checkLegacy(organizationId: string, rows: { line: number; values: Record<string, string> }[]): Promise<Checked> {
  const existing = await prisma.legacyRecord.findMany({ where: { organizationId }, select: { title: true, year: true } });
  const seen = new Set(existing.map((r) => key(r.title, r.year)));
  const out: Checked = { valid: [], errors: [] };
  const columnOf = { recordType: "record_type", title: "title", year: "year", body: "story", winner: "winner", runnerUp: "runner_up", media: "photo_urls" };

  for (const { line, values } of rows) {
    const year = blankToNull(values.year);
    const photos = (blankToNull(values.photo_urls) ?? "").split(/[\s|]+/).filter(Boolean);
    const youtube = blankToNull(values.youtube_url);
    const raw = {
      recordType: values.record_type?.trim().toLowerCase().replace(/[\s-]+/g, "_"),
      title: values.title,
      year: year === null ? null : /^\d{4}$/.test(year) ? Number(year) : year,
      body: blankToNull(values.story),
      winner: blankToNull(values.winner),
      runnerUp: blankToNull(values.runner_up),
      media: [...photos.map((url) => ({ mediaType: "image" as const, url })), ...(youtube ? [{ mediaType: "youtube" as const, url: youtube }] : [])],
    };
    const parsed = legacyInput.safeParse(raw);
    if (!parsed.success) {
      out.errors.push(...zodErrors(line, parsed.error, columnOf));
      continue;
    }
    let media: { mediaType: string; url: string; sortOrder: number }[];
    try {
      media = await checkLegacyMedia(parsed.data.media);
    } catch (err) {
      if (!(err instanceof AppError)) throw err;
      out.errors.push({ line, field: err.code === "bad_youtube_link" ? "youtube_url" : "photo_urls", message: err.message });
      continue;
    }
    const r = parsed.data;
    const k = key(r.title, r.year ?? null);
    if (seen.has(k)) {
      out.errors.push({ line, field: "title", message: "A record with this title and year is already there." });
      continue;
    }
    seen.add(k);
    out.valid.push({
      line,
      data: { ...r, media },
      preview: { line, recordType: r.recordType, title: r.title, year: r.year ?? null, photos: media.filter((m) => m.mediaType === "image").length, video: media.some((m) => m.mediaType === "youtube") },
    });
  }
  return out;
}
