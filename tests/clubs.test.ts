import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { api, prisma, resetDatabase, TEST_CLUBS, uid, type TestUserKey } from "./helpers";

const H = TEST_CLUBS.velloreHoopers;
const ACADEMY = TEST_CLUBS.velloreAcademy;
const PENDING = TEST_CLUBS.katpadiBallers;

describe("Clubs: list, page, register, review", () => {
  before(resetDatabase);

  it("visitor sees only approved clubs, with badges worked out", async () => {
    const res = await api("GET", "/api/clubs?districtCode=TN-VELLORE");
    assert.equal(res.status, 200);
    const names = res.body.clubs.map((c: { name: string }) => c.name);
    assert.deepEqual(names, ["Vellore Basketball Academy", "Vellore Hoopers"]); // Katpadi (pending) hidden
    const hoopers = res.body.clubs.find((c: { id: string }) => c.id === H);
    assert.equal(hoopers.isVerified, true);
    assert.equal(hoopers.affiliatedTo.shortName, "Vellore DBA");
    assert.equal(hoopers.memberCount, 6);
    const academy = res.body.clubs.find((c: { id: string }) => c.id === ACADEMY);
    assert.equal(academy.affiliatedTo, null); // → "Community club"
    assert.equal(academy.kind, "academy");
  });

  it("filters: kind, search, state", async () => {
    assert.equal((await api("GET", "/api/clubs?kind=academy")).body.total, 1);
    assert.equal((await api("GET", "/api/clubs?q=hoop")).body.clubs[0].id, H);
    assert.equal((await api("GET", "/api/clubs?stateCode=KA")).body.total, 0);
    assert.equal((await api("GET", "/api/clubs?kind=pizza")).status, 400);
  });

  it("an expired affiliation no longer counts as Affiliated (#58)", async () => {
    await prisma.affiliation.updateMany({ where: { clubId: H }, data: { validUntil: new Date("2020-03-31") } });
    const res = await api("GET", `/api/clubs/${H}`);
    assert.equal(res.body.affiliatedTo, null);
    await prisma.affiliation.updateMany({ where: { clubId: H }, data: { validUntil: new Date(Date.now() + 200 * 864e5) } });
  });

  it("club page: staff, coaches, timings; private details never shown", async () => {
    const res = await api("GET", `/api/clubs/${H}`);
    assert.equal(res.status, 200);
    const staff = Object.fromEntries(res.body.staff.map((s: { role: string; name: string }) => [s.role, s.name]));
    assert.deepEqual(staff, { owner: "Karthik ClubOwner", admin: "Divya ClubAdmin", captain: "Arun Captain" });
    assert.equal(res.body.coaches[0].role, "head");
    assert.equal(res.body.coaches.length, 2);
    assert.equal(res.body.timings.length, 3);
    assert.equal(res.body.courts.length, 1);
    assert.equal(res.body.viewer.canManage, false);
    assert.doesNotMatch(JSON.stringify(res.body), /@test\.baskyclub\.in|\+9190000|password/i);
  });

  it("club page shows each role what they can do", async () => {
    const as = async (who: TestUserKey) => (await api("GET", `/api/clubs/${H}`, { as: who })).body.viewer;
    assert.equal((await as("clubOwner")).isOwner, true);
    assert.equal((await as("clubAdmin")).canManage, true);
    assert.equal((await as("captain")).isCaptain, true);
    assert.equal((await as("captain")).canManage, false);
    assert.equal((await as("coach")).canManage, false);
    assert.equal((await as("player")).membership.status, "active");
    assert.equal((await as("joiner")).membership.status, "pending");
    assert.equal((await as("normalUser")).membership, null); // old "left" row doesn't count
    assert.equal((await as("baskyTeam")).canManage, true);
    assert.equal((await as("districtAdmin")).canManage, false); // association power ≠ club power
  });

  it("a pending club is hidden from the public but visible to its owner and the Basky team", async () => {
    assert.equal((await api("GET", `/api/clubs/${PENDING}`)).status, 404);
    assert.equal((await api("GET", `/api/clubs/${PENDING}`, { as: "normalUser" })).status, 404);
    assert.equal((await api("GET", `/api/clubs/${PENDING}`, { as: "pendingClubOwner" })).status, 200);
    assert.equal((await api("GET", `/api/clubs/${PENDING}`, { as: "baskyTeam" })).status, 200);
    assert.equal((await api("GET", `/api/clubs/not-a-uuid`)).status, 400);
  });

  let newClubId = "";

  it("a normal user registers a club: it waits for approval, they become owner and member", async () => {
    const res = await api("POST", "/api/clubs", {
      as: "normalUser",
      body: { name: "Gudiyatham Giants", districtCode: "tn-vellore", kind: "club", iPlay: true, primaryPosition: "PG" },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.status, "pending");
    newClubId = res.body.id;
    const role = await prisma.clubRole.findFirst({ where: { clubId: newClubId, role: "owner", toAt: null } });
    assert.equal(role?.userId, uid("normalUser"));
    const membership = await prisma.clubMembership.findFirst({ where: { clubId: newClubId, userId: uid("normalUser") } });
    assert.equal(membership?.status, "active");
    assert.equal(membership?.primaryPosition, "PG");
  });

  it("who cannot register a club: visitor, under-18, unknown district", async () => {
    assert.equal((await api("POST", "/api/clubs", { body: { name: "X Club", districtCode: "TN-VELLORE" } })).status, 401);
    const minor = await api("POST", "/api/clubs", { as: "minorPlayer", body: { name: "Junior Club", districtCode: "TN-VELLORE" } });
    assert.equal(minor.status, 403);
    assert.equal(minor.body.error.code, "adult_required");
    const district = await api("POST", "/api/clubs", { as: "player", body: { name: "Lost Club", districtCode: "TN-ATLANTIS" } });
    assert.equal(district.body.error.code, "unknown_district");
  });

  it("only the Basky team (basky admin or super admin) can approve", async () => {
    for (const who of ["normalUser", "clubOwner", "moderator", "districtAdmin", "tnbaAdmin"] as const) {
      const res = await api("POST", `/api/clubs/${newClubId}/review`, { as: who, body: { decision: "approve" } });
      assert.equal(res.status, 403, `${who} should not approve`);
    }
    const queue = await api("GET", "/api/admin/clubs?status=pending", { as: "baskyTeam" });
    assert.deepEqual(queue.body.clubs.map((c: { name: string }) => c.name).sort(), ["Gudiyatham Giants", "Katpadi Ballers"]);
    assert.equal((await api("GET", "/api/admin/clubs", { as: "moderator" })).status, 403);

    const ok = await api("POST", `/api/clubs/${newClubId}/review`, { as: "baskyTeam", body: { decision: "approve", note: "Checked" } });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.status, "approved");
    const again = await api("POST", `/api/clubs/${newClubId}/review`, { as: "baskyTeam", body: { decision: "approve" } });
    assert.equal(again.body.error.code, "wrong_status");

    const log = await prisma.changeLog.findFirst({ where: { entity: "clubs", entityId: newClubId } });
    assert.equal(log?.actorId, uid("baskyTeam"));
    assert.deepEqual(log?.afterValue, { status: "approved", note: "Checked" });

    const superAdmin = await api("POST", `/api/clubs/${PENDING}/review`, { as: "superAdmin", body: { decision: "approve" } });
    assert.equal(superAdmin.status, 200);
  });

  it("suspend hides a club; reinstate brings it back", async () => {
    await api("POST", `/api/clubs/${newClubId}/review`, { as: "baskyTeam", body: { decision: "suspend" } });
    assert.equal((await api("GET", `/api/clubs/${newClubId}`)).status, 404);
    assert.equal((await api("GET", `/api/clubs/${newClubId}`, { as: "normalUser" })).status, 200); // owner still sees it
    await api("POST", `/api/clubs/${newClubId}/review`, { as: "baskyTeam", body: { decision: "reinstate" } });
    assert.equal((await api("GET", `/api/clubs/${newClubId}`)).status, 200);
  });

  it("edit club details: owner, admin and Basky team yes; captain, coach, player, association no", async () => {
    for (const who of ["clubOwner", "clubAdmin", "baskyTeam"] as const) {
      const res = await api("PATCH", `/api/clubs/${H}`, { as: who, body: { motto: `Edited by ${who}` } });
      assert.equal(res.status, 200, `${who} should edit`);
    }
    for (const who of ["captain", "coach", "player", "districtAdmin", "moderator"] as const) {
      const res = await api("PATCH", `/api/clubs/${H}`, { as: who, body: { motto: "Hacked" } });
      assert.equal(res.status, 403, `${who} should not edit`);
    }
    assert.equal((await api("PATCH", `/api/clubs/${H}`, { body: { motto: "Visitor" } })).status, 401);
    const club = await prisma.club.findUniqueOrThrow({ where: { id: H } });
    assert.equal(club.motto, "Edited by baskyTeam");
  });

  it("status cannot be changed through the edit endpoint", async () => {
    await api("PATCH", `/api/clubs/${H}`, { as: "clubOwner", body: { status: "approved", districtCode: "TN-CHENNAI" } });
    const club = await prisma.club.findUniqueOrThrow({ where: { id: H } });
    assert.equal(club.districtCode, "TN-VELLORE");
  });
});
