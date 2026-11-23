import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CsvError, headerKey, normalizeDate, parseCsv, readTable } from "../src/server/lib/csv";

describe("CSV reader (spreadsheet uploads)", () => {
  it("plain cells, \\n and \\r\\n line ends, blank lines dropped, last line without a newline", () => {
    assert.deepEqual(parseCsv("a,b\r\n1,2\n\n3,4"), [["a", "b"], ["1", "2"], ["3", "4"]]);
  });

  it("quoted cells: commas, doubled quotes, line breaks inside, empty quoted cell", () => {
    const text = 'name,note\n"Rajan, S.","He said ""yes"""\n"Two\nlines",""\n';
    assert.deepEqual(parseCsv(text), [["name", "note"], ["Rajan, S.", 'He said "yes"'], ["Two\nlines", ""]]);
  });

  it("Excel's byte-order mark and trailing empty cells", () => {
    assert.deepEqual(parseCsv("﻿a,b,c\n1,,\n"), [["a", "b", "c"], ["1", "", ""]]);
  });

  it("broken quoting is an error with a line number", () => {
    assert.throws(() => parseCsv('a,b\n"open,1\n'), /never closed/);
    // a quote inside an unquoted cell (hand-edited files) is just a character
    assert.deepEqual(parseCsv('a,b\nsay "hi",1\n'), [["a", "b"], ['say "hi"', "1"]]);
  });

  it("headers are matched however they are written", () => {
    assert.equal(headerKey(" Term From "), "term_from");
    assert.equal(headerKey("TERM-FROM"), "term_from");
    assert.equal(headerKey("term_from"), "term_from");
  });

  const cols = { required: ["name", "term_from"], optional: ["term_to"] } as const;

  it("readTable: rows keyed by column with spreadsheet line numbers; cells trimmed", () => {
    const { rows } = readTable("Name,Term From\n  Asha ,2024-04-01\nRavi,01/04/2023\n", cols, 10);
    assert.deepEqual(rows, [
      { line: 2, values: { name: "Asha", term_from: "2024-04-01" } },
      { line: 3, values: { name: "Ravi", term_from: "01/04/2023" } },
    ]);
  });

  it("readTable: unknown, repeated or missing columns, no rows, too many rows, extra cells", () => {
    assert.throws(() => readTable("name,term_from,termto\nA,2024-01-01,x", cols, 10), /Unknown column\(s\): termto/);
    assert.throws(() => readTable("name,name,term_from\nA,B,2024-01-01", cols, 10), /appear twice: name/);
    assert.throws(() => readTable("name\nA", cols, 10), /Missing column\(s\): term_from/);
    assert.throws(() => readTable("name,term_from\n", cols, 10), /no data rows/);
    assert.throws(() => readTable("", cols, 10), CsvError);
    assert.throws(() => readTable("name,term_from\nA,1\nB,2\nC,3", cols, 2), /Too many rows \(3\)/);
    assert.throws(() => readTable("name,term_from\nA,2024-01-01,surprise", cols, 10), /Row 2 has more cells/);
    // A trailing empty cell (Excel adds them) is fine
    assert.equal(readTable("name,term_from\nA,2024-01-01,", cols, 10).rows.length, 1);
  });

  it("dates: ISO and Indian day-first forms; anything else is null", () => {
    assert.equal(normalizeDate("2024-04-01"), "2024-04-01");
    assert.equal(normalizeDate("1/4/2024"), "2024-04-01");
    assert.equal(normalizeDate("01-04-2024"), "2024-04-01");
    for (const bad of ["2024/04/01", "April 1, 2024", "1.4.2024", "24-04-01", ""]) assert.equal(normalizeDate(bad), null, bad);
  });
});
