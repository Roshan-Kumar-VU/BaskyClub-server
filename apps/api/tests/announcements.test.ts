import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { pushOutbox } from "../src/server/lib/push";
import { api, prisma, resetDatabase, TEST_ANNOUNCEMENTS, TEST_CLUBS, TEST_ORGS, TEST_POSTS, type TestUserKey } from "./helpers";

const A = TEST_ANNOUNCEMENTS;
const V = TEST_ORGS.velloreDba;
const H = TEST_CLUBS.velloreHoopers;
/** Announcement ids in someone's inbox (reply alerts are tested in reply-alerts.test.ts). */
const inbox = async (who: TestUserKey) =>
  (await api("GET", "/api/alerts", { as: who })).body.alerts
    .filter((a: { type: string }) => a.type === "announcement")
    .map((a: { id: string }) => a.id);
const pushedTo = (from: number) => pushOutbox.slice(from).map((m) => m.to).sort();

describe("Announcements and the Alerts inbox (#65, #75)", () => {
  before(resetDatabase);

  it("each person's inbox holds only what was sent to them", async () => {
    // Player: Hoopers member (Hoopers is affiliated to Vellore DBA)
    assert.deepEqual(await inbox("player"), [A.velloreDbaToAffiliated, A.hoopersToMembers, A.baskyToEveryone]);
    // Normal user: no club → only the "everyone" one
    assert.deepEqual(await inbox("normalUser"), [A.baskyToEveryone]);
    // TNBA secretary: no club in Vellore
    assert.deepEqual(await inbox("tnbaAdmin"), [A.baskyToEveryone]);
    assert.equal((await api("GET", "/api/alerts")).status, 401);
    const first = (await api("GET", "/api/alerts", { as: "player" })).body.alerts.find((a: { type: string }) => a.type === "announcement");
    assert.equal(first.postId, TEST_POSTS.officialCard); // where a tap goes
    assert.deepEqual(first.from, { type: "organization", id: V, name: "Vellore District Basketball Association", shortName: "Vellore DBA", logoUrl: null });
    assert.equal(first.feedPostId, TEST_POSTS.officialCard);
  });

  it("association → district users: alerts everyone living in that district (push to their phones)", async () => {
    const start = pushOutbox.length;
    const res = await api("POST", "/api/announcements", {
      as: "districtAdmin",
      body: { senderOrgId: V, audience: "district_users", districtCode: "TN-VELLORE", title: "Court closed Sunday", body: "The fort court is closed for repairs." },
    });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.equal(res.body.pushed, 3);
    assert.deepEqual(pushedTo(start), ["ExponentPushToken[test-club-owner]", "ExponentPushToken[test-normal-user]", "ExponentPushToken[test-player]"]);
    assert.ok((await inbox("normalUser")).includes(res.body.id));
    assert.ok(!(await inbox("tnbaAdmin")).includes(res.body.id)); // lives in Chennai
  });

  it("association senders stay inside their area and their allowed audiences", async () => {
    const outside = await api("POST", "/api/announcements", { as: "districtAdmin", body: { senderOrgId: V, audience: "district_users", districtCode: "TN-CHENNAI", title: "Hello", body: "Hello there" } });
    assert.equal(outside.body.error.code, "outside_area");
    const everyone = await api("POST", "/api/announcements", { as: "districtAdmin", body: { senderOrgId: V, audience: "everyone", title: "Hello", body: "Hello there" } });
    assert.equal(everyone.body.error.code, "audience_not_allowed");
    const notTeam = await api("POST", "/api/announcements", { as: "clubOwner", body: { senderOrgId: V, audience: "followers", title: "Hello", body: "Hello there" } });
    assert.equal(notTeam.body.error.code, "association_staff_only");
  });

  it("association → club admins in its area; → followers (any association member can send)", async () => {
    let start = pushOutbox.length;
    const admins = await api("POST", "/api/announcements", { as: "districtAdmin", body: { senderOrgId: V, audience: "club_admins_in_area", title: "Meeting of club heads", body: "Saturday 5 pm at the DBA office." } });
    assert.equal(admins.body.pushed, 1);
    assert.deepEqual(pushedTo(start), ["ExponentPushToken[test-club-owner]"]);
    for (const who of ["clubOwner", "clubAdmin", "coach"] as const) assert.ok((await inbox(who)).includes(admins.body.id), who);
    assert.ok(!(await inbox("player")).includes(admins.body.id));

    start = pushOutbox.length;
    const body = { senderOrgId: V, audience: "followers", title: "New photos", body: "2025 final photos are up." };
    // Association members are read-only (PRD §2): only owners/admins send for the association
    const member = await api("POST", "/api/announcements", { as: "associationMember", body });
    assert.equal(member.body.error?.code, "association_staff_only");
    assert.equal(pushOutbox.length, start);
    const followers = await api("POST", "/api/announcements", { as: "districtAdmin", body });
    assert.equal(followers.status, 201);
    assert.deepEqual(pushedTo(start), ["ExponentPushToken[test-normal-user]"]);
  });

  it("club owner/admin → club members; captain and players can't send", async () => {
    const start = pushOutbox.length;
    const ok = await api("POST", "/api/announcements", { as: "clubAdmin", body: { senderClubId: H, audience: "club_members", title: "Practice cancelled", body: "Rain today. See you Thursday.", showInFeed: true } });
    assert.equal(ok.status, 201);
    assert.deepEqual(pushedTo(start), ["ExponentPushToken[test-club-owner]", "ExponentPushToken[test-player]"]);
    // Its feed card is members-only
    const card = await prisma.post.findUniqueOrThrow({ where: { id: ok.body.feedPostId } });
    assert.equal(card.visibility, "members");
    for (const who of ["captain", "player", "coach"] as const) {
      const res = await api("POST", "/api/announcements", { as: who, body: { senderClubId: H, audience: "club_members", title: "Hi all", body: "Hello team" } });
      assert.equal(res.body.error.code, "club_staff_only", who);
    }
    const wrong = await api("POST", "/api/announcements", { as: "clubOwner", body: { senderClubId: H, audience: "district_users", districtCode: "TN-VELLORE", title: "Hi all", body: "Hello" } });
    assert.equal(wrong.body.error.code, "audience_not_allowed");
  });

  it("BaskyCLub team → everyone; nobody else can send as BaskyCLub", async () => {
    const start = pushOutbox.length;
    const ok = await api("POST", "/api/announcements", { as: "baskyTeam", body: { audience: "everyone", title: "App update", body: "New: follow players and creators.", showInFeed: true } });
    assert.equal(ok.body.pushed, 3);
    assert.equal(pushedTo(start).length, 3);
    for (const who of ["normalUser", "moderator", "districtAdmin"] as const) {
      assert.equal((await api("POST", "/api/announcements", { as: who, body: { audience: "everyone", title: "Hi all", body: "Hello" } })).status, 403, who);
    }
    // "Also show in feed" → a pinned Official card above the All India feed
    const feed = await api("GET", "/api/feed");
    assert.equal(feed.body.pinned[0].id, ok.body.feedPostId);
    assert.equal(feed.body.pinned[0].isPinned, true);
    const district = await api("GET", "/api/feed?scope=district&districtCode=TN-VELLORE");
    assert.deepEqual(district.body.pinned.map((p: { id: string }) => p.id), [ok.body.feedPostId, TEST_POSTS.officialCard]);
    // Second page has no pinned cards
    const one = await api("GET", "/api/feed?limit=1");
    assert.deepEqual((await api("GET", `/api/feed?limit=1&cursor=${one.body.nextCursor}`)).body.pinned, []);
  });

  it("sent box, and the 10-a-day limit", async () => {
    const sent = await api("GET", "/api/alerts?box=sent", { as: "districtAdmin" });
    assert.equal(sent.body.alerts.length, 4); // seed + 3 in this file
    for (let i = 0; i < 6; i++) {
      await api("POST", "/api/announcements", { as: "districtAdmin", body: { senderOrgId: V, audience: "followers", title: `Note ${i}`, body: "Short note" } });
    }
    const eleventh = await api("POST", "/api/announcements", { as: "districtAdmin", body: { senderOrgId: V, audience: "followers", title: "One more", body: "Short note" } });
    assert.equal(eleventh.status, 429);
  });

  it("phones: register after login, move to a new owner, remove on logout", async () => {
    const bad = await api("POST", "/api/devices", { as: "coach", body: { token: "not-a-token-123", platform: "ios" } });
    assert.equal(bad.status, 400);
    assert.equal((await api("POST", "/api/devices", { as: "coach", body: { token: "ExponentPushToken[coach-phone]", platform: "ios" } })).status, 200);
    // Same phone, someone else logs in
    await api("POST", "/api/devices", { as: "captain", body: { token: "ExponentPushToken[coach-phone]", platform: "ios" } });
    const row = await prisma.deviceToken.findUniqueOrThrow({ where: { token: "ExponentPushToken[coach-phone]" } });
    assert.notEqual(row.userId, null);
    const captain = await prisma.user.findUniqueOrThrow({ where: { email: "captain@test.baskyclub.in" } });
    assert.equal(row.userId, captain.id);
    await api("DELETE", `/api/devices?token=${encodeURIComponent("ExponentPushToken[coach-phone]")}`, { as: "captain" });
    assert.equal(await prisma.deviceToken.count({ where: { token: "ExponentPushToken[coach-phone]" } }), 0);
  });
});
