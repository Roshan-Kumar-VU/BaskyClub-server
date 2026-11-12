import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { api, resetDatabase, TEST_CLUBS, TEST_ORGS, TEST_POSTS, uid } from "./helpers";

describe("Profiles (#72) and follows (#64, #73)", () => {
  before(resetDatabase);

  it("profile page: clubs with position, pinned post, links; never email, phone or birth date", async () => {
    const res = await api("GET", `/api/users/${uid("player")}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.name, "Priya Player");
    assert.equal(res.body.instagram, "priya.hoops");
    assert.deepEqual(res.body.clubs.map((c: { name: string; position: string }) => [c.name, c.position]), [["Vellore Hoopers", "SF"]]);
    assert.equal(res.body.pinnedPost.id, TEST_POSTS.playerPhotos);
    assert.equal(res.body.followingCount, 2);
    for (const key of ["email", "phone", "dateOfBirth", "passwordHash"]) assert.equal(key in res.body, false, key);
    assert.doesNotMatch(JSON.stringify(res.body), /@test\.baskyclub\.in|\+9190000/);
  });

  it("under-18: Instagram/YouTube hidden on the profile", async () => {
    const res = await api("GET", `/api/users/${uid("minorPlayer")}`);
    assert.equal(res.body.instagram, null);
    assert.equal(res.body.youtube, null);
  });

  it("roles and creator badge show on the profile", async () => {
    const captain = await api("GET", `/api/users/${uid("captain")}`);
    assert.deepEqual(captain.body.clubs[0].roles, ["captain"]);
    const creator = await api("GET", `/api/users/${uid("creator")}`);
    assert.equal(creator.body.isCreator, true);
    assert.equal(creator.body.followerCount, 2);
  });

  it("suspended accounts have no public profile", async () => {
    assert.equal((await api("GET", `/api/users/${uid("suspended")}`)).status, 404);
  });

  it("profile posts: visitors see public ones; the owner also sees posts in review", async () => {
    const visitor = await api("GET", `/api/users/${uid("normalUser")}/posts`);
    assert.equal(visitor.body.posts.length, 0);
    const self = await api("GET", `/api/users/${uid("normalUser")}/posts`, { as: "normalUser" });
    assert.equal(self.body.posts[0].moderationStatus, "in_review");
    // Captain's members-only post: visible on his profile to members only
    assert.equal((await api("GET", `/api/users/${uid("captain")}/posts`)).body.posts.length, 0);
    assert.equal((await api("GET", `/api/users/${uid("captain")}/posts`, { as: "player" })).body.posts.length, 1);
  });

  it("edit profile: own details, district, pinned post (only own public post)", async () => {
    const res = await api("PATCH", "/api/auth/me", {
      as: "coach",
      body: { bio: "Head coach, Vellore Hoopers", instagram: "@coach.prakash", homeDistrictCode: "tn-tirupathur" },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.bio, "Head coach, Vellore Hoopers");
    assert.equal(res.body.instagram, "coach.prakash");
    assert.equal(res.body.homeDistrict.code, "TN-TIRUPATHUR");

    const othersPost = await api("PATCH", "/api/auth/me", { as: "coach", body: { pinnedPostId: TEST_POSTS.playerPhotos } });
    assert.equal(othersPost.status, 404);
    const membersPost = await api("PATCH", "/api/auth/me", { as: "captain", body: { pinnedPostId: TEST_POSTS.membersNotice } });
    assert.equal(membersPost.body.error.code, "cannot_pin");
    const pin = await api("PATCH", "/api/auth/me", { as: "clubOwner", body: { pinnedPostId: TEST_POSTS.clubHighlights } });
    assert.equal(pin.body.pinnedPost.id, TEST_POSTS.clubHighlights);
    assert.equal((await api("PATCH", "/api/auth/me", { as: "coach", body: { homeDistrictCode: "XX-NOWHERE" } })).body.error.code, "unknown_district");
    assert.equal((await api("PATCH", "/api/auth/me", { body: { bio: "x" } })).status, 401);
  });

  it("follow a club, an association and a person; no approval; following twice is harmless", async () => {
    const club = await api("POST", "/api/follows", { as: "coach", body: { targetType: "club", targetId: TEST_CLUBS.velloreHoopers } });
    assert.equal(club.body.following, true);
    const again = await api("POST", "/api/follows", { as: "coach", body: { targetType: "club", targetId: TEST_CLUBS.velloreHoopers } });
    assert.equal(again.body.followerCount, club.body.followerCount);
    await api("POST", "/api/follows", { as: "coach", body: { targetType: "organization", targetId: TEST_ORGS.velloreDba } });
    await api("POST", "/api/follows", { as: "coach", body: { targetType: "user", targetId: uid("creator") } });

    const mine = await api("GET", "/api/follows", { as: "coach" });
    assert.equal(mine.body.clubs[0].name, "Vellore Hoopers");
    assert.equal(mine.body.organizations[0].shortName, "Vellore DBA");
    assert.equal(mine.body.users[0].name, "Hari HoopsCreator");

    const page = await api("GET", `/api/clubs/${TEST_CLUBS.velloreHoopers}`, { as: "coach" });
    assert.equal(page.body.viewer.isFollowing, true);
    const profile = await api("GET", `/api/users/${uid("creator")}`, { as: "coach" });
    assert.equal(profile.body.viewer.isFollowing, true);

    const un = await api("DELETE", `/api/follows?targetType=user&targetId=${uid("creator")}`, { as: "coach" });
    assert.equal(un.body.following, false);
  });

  it("can't follow: yourself, pending clubs, draft associations, suspended people; visitors and limited under-18 can't follow", async () => {
    assert.equal((await api("POST", "/api/follows", { as: "coach", body: { targetType: "user", targetId: uid("coach") } })).body.error.code, "self_follow");
    assert.equal((await api("POST", "/api/follows", { as: "coach", body: { targetType: "club", targetId: TEST_CLUBS.katpadiBallers } })).status, 404);
    assert.equal((await api("POST", "/api/follows", { as: "coach", body: { targetType: "user", targetId: uid("suspended") } })).status, 404);
    assert.equal((await api("POST", "/api/follows", { body: { targetType: "user", targetId: uid("creator") } })).status, 401);
    const limited = await api("POST", "/api/follows", { as: "minorAwaitingParent", body: { targetType: "user", targetId: uid("creator") } });
    assert.equal(limited.body.error.code, "awaiting_parent");
    // Confirmed under-18 follows like everyone else (#74)
    assert.equal((await api("POST", "/api/follows", { as: "minorPlayer", body: { targetType: "club", targetId: TEST_CLUBS.velloreAcademy } })).status, 200);
  });
});
