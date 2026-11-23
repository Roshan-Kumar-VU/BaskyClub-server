import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { api, prisma, resetDatabase, TEST_ORGS, type TestUserKey } from "./helpers";

// PRD §6 / §2: the Basky team bulk-uploads an association's official data from a spreadsheet.
const V = TEST_ORGS.velloreDba;
const url = (kind: string, org = V) => `/api/associations/${org}/import/${kind}`;

function upload(kind: string, csv: string | Uint8Array<ArrayBuffer>, opts: { as?: TestUserKey | null; dryRun?: boolean; org?: string } = {}) {
  const form = new FormData();
  form.append("file", new Blob([csv], { type: "text/csv" }), "sheet.csv");
  if (opts.dryRun) form.append("dryRun", "1");
  return api("POST", url(kind, opts.org), { as: opts.as === undefined ? "baskyTeam" : opts.as, form });
}

// Written the way Excel saves "CSV UTF-8": byte-order mark, \r\n, quoted cells, day-first dates
const BEARERS =
  "﻿Name,Designation,Term From,Term To,Sort Order,Photo URL\r\n" +
  '"Rajan, S.",President,01/04/2024,,1,https://cdn.example.com/rajan.jpg\r\n' +
  "Meena K,Secretary,2024-04-01,31-03-2026,2,\r\n" +
  '"Arul ""Coach"" Das",Treasurer,1/4/2022,31/3/2024,3,\r\n';

describe("Bulk upload of official data (Basky team)", () => {
  before(resetDatabase);

  it("only the Basky team (and super admins) can upload or get templates", async () => {
    for (const who of ["districtAdmin", "associationMember", "moderator", "clubOwner"] as const) {
      assert.equal((await upload("office-bearers", BEARERS, { as: who, dryRun: true })).status, 403, who);
      assert.equal((await api("GET", url("office-bearers"), { as: who })).status, 403, who);
    }
    assert.equal((await upload("office-bearers", BEARERS, { as: null, dryRun: true })).status, 401);
    assert.equal((await upload("office-bearers", BEARERS, { as: "superAdmin", dryRun: true })).status, 200);
  });

  it("template: a CSV with the columns and an example row; unknown kind or association refused", async () => {
    const t = await api("GET", url("office-bearers"), { as: "baskyTeam" });
    assert.equal(t.status, 200);
    assert.match(t.contentType ?? "", /text\/csv/);
    assert.equal(Buffer.from(t.body).toString().split("\r\n")[0], "name,designation,term_from,term_to,sort_order,photo_url");
    const l = await api("GET", url("legacy"), { as: "baskyTeam" });
    assert.match(Buffer.from(l.body).toString(), /^record_type,title,year,story,winner,runner_up,photo_urls,youtube_url\r\n/);
    assert.equal((await api("GET", url("matches"), { as: "baskyTeam" })).status, 400);
    assert.equal((await upload("office-bearers", BEARERS, { dryRun: true, org: "00000000-0000-4000-8000-000000000000" })).status, 404);
    assert.equal((await upload("office-bearers", BEARERS, { dryRun: true, org: "not-an-id" })).status, 400);
  });

  it("dry run: a report with a preview and nothing saved", async () => {
    const before = await prisma.officeBearer.count({ where: { organizationId: V } });
    const res = await upload("office-bearers", BEARERS, { dryRun: true });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.dryRun, true);
    assert.equal(res.body.total, 3);
    assert.equal(res.body.valid, 3);
    assert.equal(res.body.created, 0);
    assert.deepEqual(res.body.errors, []);
    assert.deepEqual(res.body.preview[0], { line: 2, name: "Rajan, S.", designation: "President", termFrom: "2024-04-01", termTo: null });
    assert.equal(res.body.preview[2].name, 'Arul "Coach" Das');
    assert.equal(await prisma.officeBearer.count({ where: { organizationId: V } }), before);
  });

  it("every bad row is reported with its line and column; with any error nothing is saved", async () => {
    const csv =
      "name,designation,term_from,term_to,sort_order,photo_url\n" +
      "Good Person,Joint Secretary,2024-04-01,,,\n" + // line 2 fine
      "X,President,2024-04-01,,,\n" + // 3: name too short
      "Real Name,Vice President,31/02/2024,,,\n" + // 4: no such day
      "Real Name,Member,2024-04-01,2023-01-01,,\n" + // 5: ends before it starts
      "Real Name,Member,April 2024,,,\n" + // 6: unknown date shape
      "Real Name,Coach,2024-04-01,,abc,\n" + // 7: sort order not a number
      "Real Name,Media,2024-04-01,,,http://insecure.example.com/a.jpg\n" + // 8: http photo
      "Good Person,Joint Secretary,01/04/2024,,,\n"; // 9: same as line 2
    const dry = await upload("office-bearers", csv, { dryRun: true });
    assert.equal(dry.body.total, 8);
    assert.equal(dry.body.valid, 1);
    const at = (line: number) => dry.body.errors.filter((e: { line: number }) => e.line === line).map((e: { field: string }) => e.field);
    assert.deepEqual(at(3), ["name"]);
    assert.deepEqual(at(4), ["term_from"]);
    assert.deepEqual(at(5), ["term_to"]);
    assert.deepEqual(at(6), ["term_from"]);
    assert.deepEqual(at(7), ["sort_order"]);
    assert.deepEqual(at(8), ["photo_url"]);
    assert.deepEqual(at(9), ["name"]); // duplicate inside the file
    assert.equal(at(2).length, 0);

    const before = await prisma.officeBearer.count({ where: { organizationId: V } });
    const commit = await upload("office-bearers", csv);
    assert.equal(commit.status, 400);
    assert.equal(commit.body.error.code, "fix_rows");
    assert.match(commit.body.error.message, /^7 rows have problems\. Nothing was saved\.$/);
    assert.equal(commit.body.error.details.length, 7);
    assert.equal(await prisma.officeBearer.count({ where: { organizationId: V } }), before);
  });

  it("a clean file is saved in one go, shows on the page, and is logged; uploading it again creates no copies", async () => {
    const res = await upload("office-bearers", BEARERS);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.created, 3);
    const page = await api("GET", `/api/associations/${V}/office-bearers?past=1`);
    const names = JSON.stringify(page.body);
    for (const n of ["Rajan, S.", "Meena K", 'Arul \\"Coach\\" Das']) assert.ok(names.includes(n), n);
    const log = await prisma.changeLog.findFirst({ where: { entity: "office_bearers", entityId: V }, orderBy: { at: "desc" } });
    assert.deepEqual(log?.afterValue, { imported: 3, from: "spreadsheet" });

    const again = await upload("office-bearers", BEARERS, { dryRun: true });
    assert.equal(again.body.valid, 0);
    assert.equal(again.body.errors.length, 3);
    assert.match(again.body.errors[0].message, /already there/);
    assert.equal((await upload("office-bearers", BEARERS)).body.error.code, "fix_rows");
  });

  it("works on a draft association (data goes in before the page is published)", async () => {
    const draft = await api("POST", "/api/associations", {
      as: "superAdmin",
      body: { name: "Ranipet District Basketball Association", shortName: "Ranipet DBA", level: "district", parentId: TEST_ORGS.tnba, stateCode: "TN", districtCodes: ["TN-RANIPET"] },
    });
    assert.equal(draft.body.pageStatus, "draft");
    const res = await upload("office-bearers", "name,designation,term_from\nFirst Person,President,2025-04-01\n", { org: draft.body.id });
    assert.equal(res.body.created, 1);
  });

  it("Media / Legacy records: types, years, photos and a YouTube link per row", async () => {
    const csv =
      "Record Type,Title,Year,Story,Winner,Runner Up,Photo URLs,YouTube URL\n" +
      "Tournament Record,District Championship — men,2023,\"Final at the fort court, packed stands\",Vellore Hoopers,Katpadi Ballers,https://cdn.example.com/a.jpg | https://cdn.example.com/b.jpg,https://youtu.be/dQw4w9WgXcQ\n" +
      "history,How basketball came to Vellore,,Started in 1962 at Voorhees College.,,,,\n" + // fine, no year
      "achievement,X,2020,,,,,\n" + // title too short
      "trophy,State Cup,2021,,,,,\n" + // unknown type
      "achievement,State Cup,20x1,,,,,\n" + // bad year
      "achievement,State Cup,2021,,,,http://insecure.example.com/x.jpg,\n" + // http photo
      "achievement,State Cup,2021,,,,,https://vimeo.com/123\n"; // not YouTube
    const dry = await upload("legacy", csv, { dryRun: true });
    assert.equal(dry.status, 200, JSON.stringify(dry.body));
    assert.equal(dry.body.valid, 2);
    const fields = dry.body.errors.map((e: { line: number; field: string }) => `${e.line}:${e.field}`);
    assert.deepEqual(fields, ["4:title", "5:record_type", "6:year", "7:photo_urls", "8:youtube_url"]);
    assert.deepEqual(dry.body.preview[0], { line: 2, recordType: "tournament_record", title: "District Championship — men", year: 2023, photos: 2, video: true });

    const ok = await upload("legacy", csv.split("\n").slice(0, 3).join("\n"));
    assert.equal(ok.body.created, 2);
    const records = (await api("GET", `/api/associations/${V}/legacy`)).body.records;
    const champ = records.find((r: { title: string }) => r.title === "District Championship — men");
    assert.equal(champ.winner, "Vellore Hoopers");
    assert.deepEqual(champ.media.map((m: { mediaType: string; url: string }) => `${m.mediaType} ${m.url}`), [
      "image https://cdn.example.com/a.jpg",
      "image https://cdn.example.com/b.jpg",
      "youtube https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ]);
    // same title + year again → refused
    assert.equal((await upload("legacy", csv.split("\n").slice(0, 2).join("\n"), { dryRun: true })).body.errors[0].field, "title");
  });

  it("broken files get a clear message", async () => {
    const code = async (csv: string | Uint8Array<ArrayBuffer>) => (await upload("office-bearers", csv, { dryRun: true })).body.error?.code;
    const message = async (csv: string) => (await upload("office-bearers", csv, { dryRun: true })).body.error?.message;
    assert.equal(await code(""), "empty_file");
    assert.match(await message("name,designation,termfrom\nA B,President,2024-01-01\n"), /Unknown column\(s\): termfrom/);
    assert.match(await message("name,designation\nA B,President\n"), /Missing column\(s\): term_from/);
    assert.match(await message("name,designation,term_from\n"), /no data rows/);
    assert.match(await message('name,designation,term_from\n"A B,President,2024-01-01\n'), /never closed/);
    const many = "name,designation,term_from\n" + Array.from({ length: 501 }, (_, i) => `Person ${i},Member,2024-04-01`).join("\n");
    assert.match(await message(many), /Too many rows \(501\)/);
    assert.equal(await code(new Uint8Array([0x6e, 0x61, 0xff, 0xfe, 0x0a])), "not_utf8"); // e.g. an .xlsx or Latin-1 file
    assert.equal(await code(new Uint8Array(1024 * 1024 + 1).fill(0x61)), "too_big");
    const noFile = await api("POST", url("office-bearers"), { as: "baskyTeam", form: new FormData() });
    assert.equal(noFile.body.error.code, "no_file");
  });
});
