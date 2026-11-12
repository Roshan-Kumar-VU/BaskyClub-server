import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { api, prisma, resetDatabase, TEST_CLUBS, TEST_PASSWORD, TEST_USERS, uid } from "./helpers";

describe("Super-admin tools: badges, users, roles, history, zones (#12, #35, #43, #61, #73)", () => {
  before(resetDatabase);

  let badgeId = "";

  it("badges: the Basky team gives Verified to clubs and Creator to people", async () => {
    assert.equal((await api("POST", "/api/admin/badges", { as: "moderator", body: { badge: "basky_verified", clubId: TEST_CLUBS.velloreAcademy } })).status, 403);
    const ok = await api("POST", "/api/admin/badges", { as: "baskyTeam", body: { badge: "basky_verified", clubId: TEST_CLUBS.velloreAcademy } });
    assert.equal(ok.status, 201);
    badgeId = ok.body.id;
    assert.equal((await api("GET", `/api/clubs/${TEST_CLUBS.velloreAcademy}`)).body.isVerified, true);
    assert.equal((await api("POST", "/api/admin/badges", { as: "baskyTeam", body: { badge: "basky_verified", clubId: TEST_CLUBS.velloreAcademy } })).body.error.code, "already_has_badge");
    assert.equal((await api("POST", "/api/admin/badges", { as: "baskyTeam", body: { badge: "creator", clubId: TEST_CLUBS.velloreAcademy } })).status, 400);
    const creator = await api("POST", "/api/admin/badges", { as: "superAdmin", body: { badge: "creator", userId: uid("coach") } });
    assert.equal(creator.status, 201);
    assert.equal((await api("GET", `/api/users/${uid("coach")}`)).body.isCreator, true);
    assert.equal((await api("GET", "/api/admin/badges", { as: "baskyTeam" })).body.badges.length, 4);
  });

  it("taking a badge away", async () => {
    assert.equal((await api("DELETE", `/api/admin/badges/${badgeId}`, { as: "clubOwner" })).status, 403);
    assert.equal((await api("DELETE", `/api/admin/badges/${badgeId}`, { as: "baskyTeam" })).status, 200);
    assert.equal((await api("GET", `/api/clubs/${TEST_CLUBS.velloreAcademy}`)).body.isVerified, false);
  });

  it("find users: the Basky team sees contact details; nobody else can search", async () => {
    const res = await api("GET", "/api/admin/users?q=priya", { as: "baskyTeam" });
    assert.equal(res.body.users[0].email, TEST_USERS.player.email);
    assert.ok(res.body.users[0].phone);
    assert.equal((await api("GET", "/api/admin/users?status=suspended", { as: "baskyTeam" })).body.total, 1);
    for (const who of ["moderator", "districtAdmin", "clubOwner"] as const) assert.equal((await api("GET", "/api/admin/users", { as: who })).status, 403, who);
  });

  it("suspend and restore an account; guard rails", async () => {
    const reason = "Fake profile reported twice";
    assert.equal((await api("POST", `/api/admin/users/${uid("joiner")}/status`, { as: "moderator", body: { status: "suspended", reason } })).status, 403);
    assert.equal((await api("POST", `/api/admin/users/${uid("joiner")}/status`, { as: "baskyTeam", body: { status: "suspended", reason } })).body.status, "suspended");
    const login = await api("POST", "/api/auth/login", { body: { login: TEST_USERS.joiner.email, password: TEST_PASSWORD } });
    assert.equal(login.status, 403);
    assert.equal((await api("POST", `/api/admin/users/${uid("joiner")}/status`, { as: "baskyTeam", body: { status: "active", reason: "Checked, real person" } })).body.status, "active");

    assert.equal((await api("POST", `/api/admin/users/${uid("baskyTeam")}/status`, { as: "baskyTeam", body: { status: "suspended", reason } })).body.error.code, "not_yourself");
    assert.equal((await api("POST", `/api/admin/users/${uid("superAdmin")}/status`, { as: "baskyTeam", body: { status: "suspended", reason } })).body.error.code, "super_admin_only");
    assert.equal((await api("POST", `/api/admin/users/${uid("minorAwaitingParent")}/status`, { as: "baskyTeam", body: { status: "active", reason: "skip parent" } })).body.error.code, "needs_parent");

    const log = await prisma.changeLog.findMany({ where: { entity: "users", entityId: uid("joiner") }, orderBy: { at: "asc" } });
    assert.deepEqual(log.map((l) => (l.afterValue as { status: string }).status), ["suspended", "active"]);
  });

  it("BaskyCLub roles: only a super admin gives or ends them; at least one super admin stays", async () => {
    assert.equal((await api("POST", "/api/admin/roles", { as: "baskyTeam", body: { userId: uid("coach"), role: "moderator" } })).status, 403);
    const give = await api("POST", "/api/admin/roles", { as: "superAdmin", body: { userId: uid("coach"), role: "moderator" } });
    assert.equal(give.status, 201);
    assert.equal((await api("GET", "/api/moderation/cases", { as: "coach" })).status, 200); // power works at once
    assert.equal((await api("POST", "/api/admin/roles", { as: "superAdmin", body: { userId: uid("coach"), role: "moderator" } })).body.error.code, "already_has_role");
    assert.equal((await api("DELETE", `/api/admin/roles/${give.body.id}`, { as: "superAdmin" })).status, 200);
    assert.equal((await api("GET", "/api/moderation/cases", { as: "coach" })).status, 403); // and goes at once

    const only = await prisma.platformRole.findFirstOrThrow({ where: { role: "super_admin", toAt: null } });
    assert.equal((await api("DELETE", `/api/admin/roles/${only.id}`, { as: "superAdmin" })).body.error.code, "last_super_admin");
    const list = await api("GET", "/api/admin/roles", { as: "baskyTeam" });
    assert.deepEqual(list.body.roles.map((r: { role: string }) => r.role).sort(), ["basky_admin", "moderator", "super_admin"]);
  });

  it("history: who changed what", async () => {
    const res = await api("GET", "/api/admin/change-log?entity=platform_roles", { as: "baskyTeam" });
    assert.equal(res.body.changes.length, 2);
    assert.equal(res.body.changes[0].actor.name, "Sara SuperAdmin");
    assert.equal((await api("GET", "/api/admin/change-log", { as: "moderator" })).status, 403);
  });

  it("zones and districts can be corrected from the dashboard (#18, #61)", async () => {
    assert.equal((await api("PATCH", "/api/admin/zones/tn-z-chn", { as: "baskyTeam", body: { name: "Chennai Zone (North)" } })).status, 200);
    assert.equal((await prisma.zone.findUniqueOrThrow({ where: { code: "TN-Z-CHN" } })).name, "Chennai Zone (North)");
    assert.equal((await api("PATCH", "/api/admin/zones/TN-Z-CHN", { as: "baskyTeam", body: { hqDistrictCode: "KA-BENGALURU-URBAN" } })).body.error.code, "unknown_district");
    assert.equal((await api("PATCH", "/api/admin/districts/TN-CUDDALORE", { as: "baskyTeam", body: { zoneCode: "TN-Z-TRY" } })).status, 200);
    assert.equal((await prisma.district.findUniqueOrThrow({ where: { code: "TN-CUDDALORE" } })).zoneCode, "TN-Z-TRY");
    assert.equal((await api("PATCH", "/api/admin/districts/TN-CUDDALORE", { as: "tnbaAdmin", body: { zoneCode: "TN-Z-CHN" } })).status, 403);
    assert.equal((await api("PATCH", "/api/admin/zones/XX-Z-NONE", { as: "baskyTeam", body: { name: "Nope" } })).status, 404);
  });
});
