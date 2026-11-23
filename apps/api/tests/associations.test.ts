import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { api, prisma, resetDatabase, TEST_ORGS, TEST_POSTS, uid } from "./helpers";

const V = TEST_ORGS.velloreDba;

describe("Associations: page, team, office bearers, Media / Legacy, official posts", () => {
  before(resetDatabase);

  it("visitor sees published and claimed associations with the right label (#59)", async () => {
    const list = await api("GET", "/api/associations");
    assert.equal(list.body.total, 4);
    const vellore = await api("GET", `/api/associations/${V}`);
    assert.equal(vellore.status, 200);
    assert.equal(vellore.body.pageLabel, "Official");
    assert.deepEqual(vellore.body.coveredDistricts.map((d: { code: string }) => d.code), ["TN-TIRUPATHUR", "TN-VELLORE"]);
    assert.deepEqual(vellore.body.officeBearers.map((b: { designation: string }) => b.designation), ["President", "Secretary", "Joint Secretary"]);
    assert.deepEqual(vellore.body.affiliatedClubs.map((c: { name: string }) => c.name), ["Vellore Hoopers"]);
    assert.equal(vellore.body.parent.shortName, "TNBA");
    assert.equal(vellore.body.legacyCount, 2);
    assert.equal(vellore.body.followerCount, 1);
    const chennai = await api("GET", `/api/associations/${TEST_ORGS.chennaiDba}`);
    assert.equal(chennai.body.pageLabel, "Managed by BaskyCLub");
    const tnba = await api("GET", `/api/associations/${TEST_ORGS.tnba}`);
    assert.deepEqual(tnba.body.children.map((c: { shortName: string }) => c.shortName), ["Chennai DBA", "Vellore DBA"]);
  });

  let draftId = "";

  it("only the Basky team creates associations; new ones start as hidden drafts", async () => {
    const body = { name: "Ranipet District Basketball Association", shortName: "Ranipet DBA", level: "district", parentId: TEST_ORGS.tnba, stateCode: "TN", districtCodes: ["TN-RANIPET"] };
    for (const who of ["districtAdmin", "tnbaAdmin", "moderator", "clubOwner"] as const) {
      assert.equal((await api("POST", "/api/associations", { as: who, body })).status, 403, who);
    }
    assert.equal((await api("POST", "/api/associations", { as: "baskyTeam", body: { ...body, stateCode: undefined } })).body.error.code, "state_required");
    const res = await api("POST", "/api/associations", { as: "baskyTeam", body });
    assert.equal(res.status, 201);
    assert.equal(res.body.pageStatus, "draft");
    draftId = res.body.id;
    assert.equal((await api("GET", `/api/associations/${draftId}`)).status, 404);
    assert.equal((await api("GET", `/api/associations/${draftId}`, { as: "baskyTeam" })).status, 200);
    assert.equal((await api("GET", "/api/associations")).body.total, 4);
    const ranipet = await prisma.district.findUniqueOrThrow({ where: { code: "TN-RANIPET" } });
    assert.equal(ranipet.associationId, draftId);
  });

  it("editing: owner/admin yes; members, parent association and others no; only the Basky team changes page state", async () => {
    assert.equal((await api("PATCH", `/api/associations/${V}`, { as: "districtAdmin", body: { contactPhone: "0416 222 3333" } })).status, 200);
    for (const who of ["associationMember", "tnbaAdmin", "clubOwner", "moderator"] as const) {
      assert.equal((await api("PATCH", `/api/associations/${V}`, { as: who, body: { contactPhone: "x" } })).status, 403, who);
    }
    const state = await api("PATCH", `/api/associations/${V}`, { as: "districtAdmin", body: { pageStatus: "draft" } });
    assert.equal(state.body.error.code, "basky_team_only");
    const publish = await api("PATCH", `/api/associations/${draftId}`, { as: "baskyTeam", body: { pageStatus: "published" } });
    assert.equal(publish.body.pageStatus, "published");
    assert.equal((await api("GET", `/api/associations/${draftId}`)).status, 200);
  });

  it("association team: owner adds admins; admins add members; only the Basky team makes owners", async () => {
    const asAdmin = await api("POST", `/api/associations/${V}/members`, { as: "districtAdmin", body: { userId: uid("clubOwner"), accessLevel: "admin" } });
    assert.equal(asAdmin.status, 201);
    const adminAddsAdmin = await api("POST", `/api/associations/${V}/members`, { as: "clubOwner", body: { userId: uid("coach"), accessLevel: "admin" } });
    assert.equal(adminAddsAdmin.body.error.code, "owner_only");
    assert.equal((await api("POST", `/api/associations/${V}/members`, { as: "clubOwner", body: { userId: uid("coach"), accessLevel: "member" } })).status, 201);
    const owner = await api("POST", `/api/associations/${V}/members`, { as: "districtAdmin", body: { userId: uid("coach"), accessLevel: "owner" } });
    assert.equal(owner.body.error.code, "basky_team_only");
    assert.equal((await api("POST", `/api/associations/${V}/members`, { as: "associationMember", body: { userId: uid("player"), accessLevel: "member" } })).status, 403);
    // Changing level keeps history: coach member → admin
    await api("POST", `/api/associations/${V}/members`, { as: "districtAdmin", body: { userId: uid("coach"), accessLevel: "admin" } });
    const rows = await prisma.organizationMember.findMany({ where: { organizationId: V, userId: uid("coach") }, orderBy: { fromAt: "asc" } });
    assert.deepEqual(rows.map((r) => [r.accessLevel, r.toAt === null]), [["member", false], ["admin", true]]);
    const list = await api("GET", `/api/associations/${V}/members`, { as: "districtAdmin" });
    assert.equal(list.body.members.length, 4);
    // Stepping down
    const mine = rows[1];
    assert.equal((await api("DELETE", `/api/organization-members/${mine.id}`, { as: "coach" })).status, 200);
    assert.equal((await api("GET", `/api/associations/${V}/members`, { as: "coach" })).status, 403);
  });

  it("office bearers: current list, past terms, add / end / delete by staff only", async () => {
    const all = await api("GET", `/api/associations/${V}/office-bearers?past=1`);
    assert.equal(all.body.officeBearers.length, 4);
    assert.equal(all.body.officeBearers.filter((b: { isCurrent: boolean }) => !b.isCurrent)[0].name, "Mr. K. Murugan");

    const add = await api("POST", `/api/associations/${V}/office-bearers`, { as: "districtAdmin", body: { name: "Ms. R. Devi", designation: "Treasurer", termFrom: "2024-04-01", sortOrder: 4 } });
    assert.equal(add.status, 201);
    assert.equal((await api("POST", `/api/associations/${V}/office-bearers`, { as: "associationMember", body: { name: "X Y", designation: "Treasurer", termFrom: "2024-04-01" } })).status, 403);
    const bad = await api("POST", `/api/associations/${V}/office-bearers`, { as: "districtAdmin", body: { name: "X Y", designation: "Treasurer", termFrom: "2024-04-01", termTo: "2023-01-01" } });
    assert.equal(bad.body.error.code, "bad_term");

    await api("PATCH", `/api/office-bearers/${add.body.id}`, { as: "districtAdmin", body: { termTo: "2025-03-31" } });
    const current = await api("GET", `/api/associations/${V}/office-bearers`);
    assert.ok(!current.body.officeBearers.some((b: { name: string }) => b.name === "Ms. R. Devi"));
    assert.equal((await api("DELETE", `/api/office-bearers/${add.body.id}`, { as: "districtAdmin" })).status, 200);
  });

  it("Media / Legacy (#66): records with photos and YouTube; staff add, edit, delete", async () => {
    const list = await api("GET", `/api/associations/${V}/legacy`);
    assert.equal(list.body.records.length, 2);
    const final = list.body.records.find((r: { year: number }) => r.year === 2025);
    assert.deepEqual(final.media.map((m: { mediaType: string }) => m.mediaType), ["image", "youtube"]);

    const add = await api("POST", `/api/associations/${V}/legacy`, {
      as: "districtAdmin",
      body: { recordType: "achievement", title: "U-16 state runners-up", year: 2024, media: [{ mediaType: "youtube", url: "https://youtu.be/dQw4w9WgXcQ" }, { mediaType: "image", url: "https://cdn.example.com/u16.jpg" }] },
    });
    assert.equal(add.status, 201);
    const badYt = await api("POST", `/api/associations/${V}/legacy`, { as: "districtAdmin", body: { recordType: "history", title: "x yz", media: [{ mediaType: "youtube", url: "https://vimeo.com/1" }] } });
    assert.equal(badYt.body.error.code, "bad_youtube_link");
    assert.equal((await api("POST", `/api/associations/${V}/legacy`, { as: "player", body: { recordType: "history", title: "x yz" } })).status, 403);
    await api("PATCH", `/api/legacy/${add.body.id}`, { as: "districtAdmin", body: { title: "U-16 state runners-up (girls)", media: [] } });
    const after = (await api("GET", `/api/associations/${V}/legacy`)).body.records.find((r: { id: string }) => r.id === add.body.id);
    assert.equal(after.title, "U-16 state runners-up (girls)");
    assert.equal(after.media.length, 0);
    assert.equal((await api("DELETE", `/api/legacy/${add.body.id}`, { as: "districtAdmin" })).status, 200);
  });

  it("official posts: the association's owner/admins post for it; members (read-only) and others can't", async () => {
    const post = await api("POST", "/api/posts", { as: "districtAdmin", body: { organizationId: V, content: "Coaching clinic on Sunday" } });
    assert.equal(post.status, 201, JSON.stringify(post.body));
    assert.equal(post.body.moderationStatus, "published");
    assert.equal(post.body.districtCode, "TN-VELLORE");
    assert.equal(post.body.organization.shortName, "Vellore DBA");
    for (const who of ["associationMember", "player", "tnbaAdmin"] as const) {
      const res = await api("POST", "/api/posts", { as: who, body: { organizationId: V, content: "x" } });
      assert.equal(res.body.error?.code, "association_staff_only", who);
    }
    // The Basky team can post for any association
    const fromTeam = await api("POST", "/api/posts", { as: "baskyTeam", body: { organizationId: V, content: "From the Basky team" } });
    assert.equal(fromTeam.status, 201);
    assert.equal((await api("POST", "/api/posts", { as: "districtAdmin", body: { organizationId: V, content: "x", visibility: "club_page" } })).body.error.code, "official_public");
    const page = await api("GET", `/api/associations/${V}/posts`);
    assert.deepEqual(page.body.posts.map((p: { id: string }) => p.id), [fromTeam.body.id, post.body.id, TEST_POSTS.officialCard]);
  });

  it("coverage: only the Basky team sets which districts an association covers", async () => {
    const body = { districtCodes: ["TN-CHENNAI", "TN-CHENGALPATTU"] };
    assert.equal((await api("PUT", `/api/associations/${TEST_ORGS.chennaiDba}/districts`, { as: "tnbaAdmin", body })).status, 403);
    assert.equal((await api("PUT", `/api/associations/${TEST_ORGS.chennaiDba}/districts`, { as: "baskyTeam", body })).status, 200);
    const page = await api("GET", `/api/associations/${TEST_ORGS.chennaiDba}`);
    assert.equal(page.body.coveredDistricts.length, 2);
    assert.equal((await api("PUT", `/api/associations/${TEST_ORGS.chennaiDba}/districts`, { as: "baskyTeam", body: { districtCodes: ["TN-NOWHERE"] } })).body.error.code, "unknown_district");
  });

  it("the association page tells each viewer what they can do", async () => {
    const as = async (who: Parameters<typeof uid>[0]) => (await api("GET", `/api/associations/${V}`, { as: who })).body.viewer;
    assert.deepEqual(await as("districtAdmin"), { isFollowing: false, accessLevel: "owner", canManage: true, canPostOfficially: true });
    assert.equal((await as("associationMember")).canManage, false);
    assert.equal((await as("associationMember")).canPostOfficially, true);
    assert.equal((await as("normalUser")).isFollowing, true);
    assert.equal((await as("baskyTeam")).canManage, true);
    assert.equal((await as("tnbaAdmin")).canManage, false); // no automatic power over district pages
  });
});
