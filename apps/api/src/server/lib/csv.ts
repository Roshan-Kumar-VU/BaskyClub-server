// Small CSV reader for spreadsheet uploads (Excel / Google Sheets "Download as CSV").
// RFC 4180: commas, quoted cells ("a, b"), doubled quotes inside quotes (""), line breaks inside
// quotes, \n or \r\n line ends, and the byte-order mark Excel adds. A quote in the middle of an
// unquoted cell (hand-edited files) is kept as a character. No dependency needed.

export class CsvError extends Error {}

/** Rows of cells. Fully blank lines are dropped. */
export function parseCsv(text: string): string[][] {
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;

  const endRow = () => {
    row.push(cell);
    if (row.some((c) => c.trim() !== "")) rows.push(row);
    row = [];
    cell = "";
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell.trim() === "") {
      cell = "";
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      endRow();
      line++;
    } else {
      cell += ch;
    }
  }
  if (quoted) throw new CsvError(`Line ${line}: a quoted cell is never closed.`);
  if (cell !== "" || row.length) endRow();
  return rows;
}

/** "Term From", "term_from", " TERM-FROM " → "term_from" */
export const headerKey = (h: string) => h.trim().toLowerCase().replace(/[\s-]+/g, "_");

/**
 * Header row + data rows → one object per row (keys from headerKey), with its line number for
 * error messages. Unknown or repeated columns are errors, so a typo can't silently drop data.
 */
export function readTable(
  text: string,
  columns: { required: readonly string[]; optional: readonly string[] },
  maxRows: number,
): { rows: { line: number; values: Record<string, string> }[] } {
  const [header, ...data] = parseCsv(text);
  if (!header) throw new CsvError("The file is empty.");
  const keys = header.map(headerKey);
  const known = new Set([...columns.required, ...columns.optional]);
  const unknown = keys.filter((k) => k && !known.has(k));
  if (unknown.length) throw new CsvError(`Unknown column(s): ${unknown.join(", ")}. Allowed: ${[...known].join(", ")}.`);
  const dupes = keys.filter((k, i) => k && keys.indexOf(k) !== i);
  if (dupes.length) throw new CsvError(`Column(s) appear twice: ${[...new Set(dupes)].join(", ")}.`);
  const missing = columns.required.filter((c) => !keys.includes(c));
  if (missing.length) throw new CsvError(`Missing column(s): ${missing.join(", ")}.`);
  if (!data.length) throw new CsvError("The file has a header row but no data rows.");
  if (data.length > maxRows) throw new CsvError(`Too many rows (${data.length}). Upload at most ${maxRows} at a time.`);

  return {
    rows: data.map((cells, i) => {
      if (cells.length > keys.length && cells.slice(keys.length).some((c) => c.trim() !== "")) {
        throw new CsvError(`Row ${i + 2} has more cells than there are columns.`);
      }
      const values: Record<string, string> = {};
      keys.forEach((k, j) => {
        if (k) values[k] = (cells[j] ?? "").trim();
      });
      return { line: i + 2, values };
    }),
  };
}

/**
 * A date as spreadsheets in India write it: 2024-04-01, 01/04/2024 or 01-04-2024 (day first)
 * → "YYYY-MM-DD", or null if it isn't one of those shapes. Whether the day exists is checked later.
 */
export function normalizeDate(input: string): string | null {
  const s = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}
