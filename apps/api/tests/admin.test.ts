import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { api, prisma, resetDatabase, TEST_CLUBS, TEST_PASSWORD, TEST_POSTS, TEST_USERS, uid } from "./helpers";

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

  it("limited: browse only, can still log in; the Basky team can restore an adult", async () => {
    const reason = "Spam while we check";
    const set = (who: Parameters<typeof uid>[0], status: string, as: Parameters<typeof uid>[0] = "baskyTeam") =>
      api("POST", `/api/admin/users/${uid(who)}/status`, { as, body: { status, reason } });
    assert.equal((await set("normalUser", "limited")).body.status, "limited");
    const login = await api("POST", "/api/auth/login", { body: { login: TEST_USERS.normalUser.email, password: TEST_PASSWORD } });
    assert.equal(login.status, 200);
    const me = await api("GET", "/api/auth/me", { as: "normalUser" });
    assert.equal(me.body.status, "limited");
    assert.equal(me.body.awaitingParent, false); // an adult isn't waiting for a parent
    const post = await api("POST", "/api/posts", { as: "normalUser", body: { content: "hi" } });
    assert.equal(post.body.error.code, "account_limited");
    assert.equal((await api("GET", "/api/feed", { as: "normalUser" })).status, 200); // browsing works
    assert.equal((await set("normalUser", "active")).body.status, "active");
    // An under-18 waiting for a parent still needs the parent, and keeps its own message
    assert.equal((await set("minorAwaitingParent", "active")).body.error.code, "needs_parent");
    assert.equal((await api("GET", "/api/auth/me", { as: "minorAwaitingParent" })).body.awaitingParent, true);
    // A minor whose parent already confirmed can be limited and restored by the team
    assert.equal((await set("minorPlayer", "limited")).body.status, "limited");
    assert.equal((await set("minorPlayer", "active")).body.status, "active");
    // Unknown status
    assert.equal((await set("normalUser", "banned")).status, 400);
  });

  it("deleted: can't log in, profile and posts disappear; refused while roles or ownership depend on the person", async () => {
    const reason = "Asked us to delete the account";
    const set = (who: Parameters<typeof uid>[0], status: string) =>
      api("POST", `/api/admin/users/${uid(who)}/status`, { as: "baskyTeam", body: { status, reason } });
    assert.equal((await set("moderator", "deleted")).body.error.code, "remove_roles_first");
    assert.equal((await set("clubOwner", "deleted")).body.error.code, "hand_over_first");
    assert.equal((await set("districtAdmin", "deleted")).body.error.code, "hand_over_first");

    assert.equal((await api("GET", "/api/auth/me", { as: "creator" })).status, 200); // logged in before the delete
    assert.equal((await set("creator", "deleted")).body.status, "deleted");
    const login = await api("POST", "/api/auth/login", { body: { login: TEST_USERS.creator.email, password: TEST_PASSWORD } });
    assert.equal(login.status, 401);
    assert.equal((await api("GET", "/api/auth/me", { as: "creator" })).status, 401); // an old token stops working
    assert.equal((await api("GET", `/api/users/${uid("creator")}`)).status, 404);
    assert.equal((await api("GET", `/api/posts/${TEST_POSTS.creatorDrill}`)).status, 404);
    // Final here: can't be restored or changed again
    assert.equal((await set("creator", "active")).status, 404);
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

  it("history: who changed what (super admin only)", async () => {
    const res = await api("GET", "/api/admin/change-log?entity=platform_roles", { as: "superAdmin" });
    assert.equal(res.body.changes.length, 2);
    assert.equal(res.body.changes[0].actor.name, "Sara SuperAdmin");
    for (const who of ["baskyTeam", "moderator", "clubOwner"] as const) {
      assert.equal((await api("GET", "/api/admin/change-log", { as: who })).status, 403, who);
    }
    assert.equal((await api("GET", "/api/admin/change-log")).status, 401);
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
