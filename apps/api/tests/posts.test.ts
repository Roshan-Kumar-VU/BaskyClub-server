import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { api, prisma, resetDatabase, TEST_CLUBS, TEST_POSTS, uid, type TestUserKey } from "./helpers";

const H = TEST_CLUBS.velloreHoopers;
const P = TEST_POSTS;
const ids = (res: { body: { posts: { id: string }[] } }) => res.body.posts.map((p) => p.id);

describe("Posts and feeds: who sees what (#41, #57)", () => {
  before(resetDatabase);

  it("All India feed: only public, published posts, newest first", async () => {
    const res = await api("GET", "/api/feed");
    assert.equal(res.status, 200);
    assert.deepEqual(ids(res), [P.juniorPost, P.officialCard, P.tnbaNews, P.creatorDrill, P.clubHighlights, P.playerPhotos]);
    const drill = res.body.posts.find((p: { id: string }) => p.id === P.creatorDrill);
    assert.equal(drill.author.isCreator, true);
    assert.equal(drill.likeCount, 5);
    assert.equal(drill.commentCount, 4);
    assert.equal(drill.media[0].mediaType, "youtube");
    assert.equal(drill.likedByMe, false);
    assert.match(drill.shareUrl, /\/p\/0000000d/);
    assert.doesNotMatch(JSON.stringify(res.body), /@test\.baskyclub\.in|\+9190000|dateOfBirth/);
  });

  it("district feed shows only that district; page cursor works", async () => {
    const chennai = await api("GET", "/api/feed?scope=district&districtCode=tn-chennai");
    assert.deepEqual(ids(chennai), [P.tnbaNews]);
    const page1 = await api("GET", "/api/feed?scope=district&districtCode=TN-VELLORE&limit=2");
    assert.equal(page1.body.posts.length, 2);
    const page2 = await api("GET", `/api/feed?scope=district&districtCode=TN-VELLORE&limit=2&cursor=${page1.body.nextCursor}`);
    assert.deepEqual(ids(page2), [P.creatorDrill, P.clubHighlights]);
    const page3 = await api("GET", `/api/feed?scope=district&districtCode=TN-VELLORE&limit=2&cursor=${page2.body.nextCursor}`);
    assert.deepEqual(ids(page3), [P.playerPhotos]);
    assert.equal(page3.body.nextCursor, null);
    assert.equal((await api("GET", "/api/feed?scope=district")).body.error.code, "district_required");
  });

  it("likedByMe is per person", async () => {
    const res = await api("GET", "/api/feed", { as: "player" });
    const liked = res.body.posts.filter((p: { likedByMe: boolean }) => p.likedByMe).map((p: { id: string }) => p.id);
    assert.deepEqual(liked.sort(), [P.clubHighlights, P.creatorDrill, P.juniorPost].sort());
  });

  it("Following feed: followed people/clubs/associations + my clubs' club-page and members posts + my own", async () => {
    assert.equal((await api("GET", "/api/feed?scope=following")).status, 400); // visitor
    // Player: member of Hoopers, follows the creator and TNBA
    const player = ids(await api("GET", "/api/feed?scope=following", { as: "player" }));
    assert.deepEqual(new Set(player), new Set([P.creatorDrill, P.trialsClubPage, P.membersNotice, P.clubHighlights, P.playerPhotos]));
    // Normal user: follows Hoopers (not a member) → club's public + club-page posts, not members-only; sees own post in review
    const normal = ids(await api("GET", "/api/feed?scope=following", { as: "normalUser" }));
    // …and follows Vellore DBA → its official card
    assert.deepEqual(new Set(normal), new Set([P.noClubInReview, P.trialsClubPage, P.clubHighlights, P.officialCard]));
  });

  it("members-only post: club members and moderators yes; everyone else gets 'not found'", async () => {
    const yes: TestUserKey[] = ["captain", "player", "minorPlayer", "coach", "clubOwner", "moderator", "superAdmin"];
    const no: (TestUserKey | null)[] = [null, "normalUser", "joiner", "creator", "districtAdmin", "pendingClubOwner"];
    for (const who of yes) assert.equal((await api("GET", `/api/posts/${P.membersNotice}`, { as: who })).status, 200, `${who} should see`);
    for (const who of no) assert.equal((await api("GET", `/api/posts/${P.membersNotice}`, { as: who })).status, 404, `${who ?? "visitor"} should not see`);
  });

  it("club page: public + club-page posts for everyone, members-only posts for members", async () => {
    const visitor = ids(await api("GET", `/api/clubs/${H}/posts`));
    assert.deepEqual(visitor, [P.trialsClubPage, P.clubHighlights]);
    const member = ids(await api("GET", `/api/clubs/${H}/posts`, { as: "coach" }));
    assert.deepEqual(member, [P.trialsClubPage, P.membersNotice, P.clubHighlights]);
  });

  it("a post waiting for review: only its author and moderators see it", async () => {
    assert.equal((await api("GET", `/api/posts/${P.noClubInReview}`, { as: "normalUser" })).body.moderationStatus, "in_review");
    assert.equal((await api("GET", `/api/posts/${P.noClubInReview}`, { as: "moderator" })).status, 200);
    assert.equal((await api("GET", `/api/posts/${P.noClubInReview}`)).status, 404);
    assert.equal((await api("GET", `/api/posts/${P.noClubInReview}`, { as: "player" })).status, 404);
  });

  it("posting rules (PRD §7): current/past club members and staff publish at once; nobody else posts", async () => {
    const post = (as: TestUserKey) => api("POST", "/api/posts", { as, body: { content: `Hello from ${as}` } });
    // Current member, past member (left Vellore Hoopers), Basky staff → published immediately, no review case
    for (const who of ["player", "normalUser", "moderator", "baskyTeam"] as const) {
      const res = await post(who);
      assert.equal(res.status, 201, `${who}: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.moderationStatus, "published", who);
      assert.equal(await prisma.moderationCase.count({ where: { targetId: res.body.id } }), 0, who);
    }
    // No club: Creator badge alone, association owner (personal post), pending join request,
    // member of a club that isn't approved yet → 403
    for (const who of ["creator", "districtAdmin", "associationMember", "joiner", "pendingClubOwner"] as const) {
      const res = await post(who);
      assert.equal(res.status, 403, `${who}: ${JSON.stringify(res.body)}`);
      assert.equal(res.body.error.code, "club_members_only", who);
    }
    // Not allowed at all: visitor, under-18 awaiting parent
    assert.equal((await api("POST", "/api/posts", { body: { content: "hi" } })).status, 401);
    assert.equal((await post("minorAwaitingParent")).body.error.code, "awaiting_parent");
  });

  it("a removed member is not a past member; a past member can't post for the club they left", async () => {
    const m = await prisma.clubMembership.findFirstOrThrow({ where: { userId: uid("normalUser"), clubId: H } });
    await prisma.clubMembership.update({ where: { id: m.id }, data: { status: "removed" } });
    try {
      const res = await api("POST", "/api/posts", { as: "normalUser", body: { content: "after removal" } });
      assert.equal(res.body.error?.code, "club_members_only");
    } finally {
      await prisma.clubMembership.update({ where: { id: m.id }, data: { status: m.status } });
    }
    // Left the club: personal/public posts only, not posts for that club
    for (const visibility of ["public", "club_page", "members"] as const) {
      const res = await api("POST", "/api/posts", { as: "normalUser", body: { content: "for my old club", clubId: H, visibility } });
      assert.equal(res.body.error?.code, "members_only", visibility);
    }
  });

  it("district is filled automatically: club post → club's district, else home district (rule 10)", async () => {
    await prisma.user.update({ where: { id: uid("player") }, data: { homeDistrictCode: "TN-CHENNAI" } });
    try {
      const own = await api("POST", "/api/posts", { as: "player", body: { content: "From Chennai" } });
      assert.equal(own.body.districtCode, "TN-CHENNAI");
      const club = await api("POST", "/api/posts", { as: "player", body: { content: "Club post", clubId: H } });
      assert.equal(club.body.districtCode, "TN-VELLORE");
      assert.equal(club.body.club.name, "Vellore Hoopers");
    } finally {
      await prisma.user.update({ where: { id: uid("player") }, data: { homeDistrictCode: "TN-VELLORE" } });
    }
  });

  it("only members can post for a club; club-page/members posts need a club", async () => {
    const outsider = await api("POST", "/api/posts", { as: "creator", body: { content: "x", clubId: H } });
    assert.equal(outsider.body.error.code, "members_only");
    const noClub = await api("POST", "/api/posts", { as: "player", body: { content: "x", visibility: "members" } });
    assert.equal(noClub.body.error.code, "club_required");
    const pending = await api("POST", "/api/posts", { as: "pendingClubOwner", body: { content: "x", clubId: TEST_CLUBS.katpadiBallers } });
    assert.equal(pending.status, 404); // club not approved yet
  });

  it("photos and YouTube: up to 10 photos, https only, real YouTube links (cleaned)", async () => {
    const images = Array.from({ length: 10 }, (_, i) => ({ url: `https://cdn.example.com/p${i}.jpg` }));
    const ok = await api("POST", "/api/posts", { as: "captain", body: { images, youtubeUrl: "https://youtu.be/dQw4w9WgXcQ?si=abc" } });
    assert.equal(ok.status, 201);
    assert.equal(ok.body.media.length, 11);
    assert.equal(ok.body.media[10].url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    const eleven = await api("POST", "/api/posts", { as: "captain", body: { images: [...images, { url: "https://cdn.example.com/x.jpg" }] } });
    assert.equal(eleven.status, 400);
    const http = await api("POST", "/api/posts", { as: "captain", body: { images: [{ url: "http://insecure.com/a.jpg" }] } });
    assert.equal(http.status, 400);
    const badYt = await api("POST", "/api/posts", { as: "captain", body: { youtubeUrl: "https://vimeo.com/123" } });
    assert.equal(badYt.body.error.code, "bad_youtube_link");
    const empty = await api("POST", "/api/posts", { as: "captain", body: { content: "   " } });
    assert.equal(empty.status, 400);
  });

  it("spam limit: 10 posts an hour", async () => {
    // captain already made 1 post in this file
    for (let i = 0; i < 9; i++) await api("POST", "/api/posts", { as: "captain", body: { content: `post ${i}` } });
    const tooMany = await api("POST", "/api/posts", { as: "captain", body: { content: "one more" } });
    assert.equal(tooMany.status, 429);
  });

  it("edit and delete: author edits; author or moderator deletes; others can't", async () => {
    assert.equal((await api("PATCH", `/api/posts/${P.playerPhotos}`, { as: "clubOwner", body: { content: "hack" } })).status, 403);
    const edit = await api("PATCH", `/api/posts/${P.playerPhotos}`, { as: "player", body: { content: "Sunday shootaround (edited)" } });
    assert.equal(edit.body.content, "Sunday shootaround (edited)");
    assert.equal(edit.body.moderationStatus, "published");

    // Editing never changes the post's state: a post a moderator hid stays hidden (no way around a hide)
    const p = await api("POST", "/api/posts", { as: "coach", body: { content: "first" } });
    await prisma.post.update({ where: { id: p.body.id }, data: { moderationStatus: "hidden" } });
    const e = await api("PATCH", `/api/posts/${p.body.id}`, { as: "coach", body: { content: "changed after the hide" } });
    assert.equal(e.body.moderationStatus, "hidden");
    assert.equal(e.body.content, "changed after the hide");

    assert.equal((await api("DELETE", `/api/posts/${P.juniorPost}`, { as: "captain" })).status, 403);
    assert.equal((await api("DELETE", `/api/posts/${P.juniorPost}`, { as: "moderator" })).status, 200);
    assert.equal((await api("GET", `/api/posts/${P.juniorPost}`)).status, 404);
    // Deleting a pinned post unpins it
    assert.equal((await api("DELETE", `/api/posts/${P.playerPhotos}`, { as: "player" })).status, 200);
    const player = await prisma.user.findUniqueOrThrow({ where: { id: uid("player") } });
    assert.equal(player.pinnedPostId, null);
  });

  it("posts by a suspended account disappear from feeds", async () => {
    await prisma.user.update({ where: { id: uid("creator") }, data: { status: "suspended" } });
    assert.ok(!ids(await api("GET", "/api/feed")).includes(P.creatorDrill));
    assert.equal((await api("GET", `/api/posts/${P.creatorDrill}`)).status, 404);
    await prisma.user.update({ where: { id: uid("creator") }, data: { status: "active" } });
  });

  it("share: counts and returns the link; members-only posts can't be shared", async () => {
    const res = await api("POST", `/api/posts/${P.creatorDrill}/share`, { as: "joiner" });
    assert.equal(res.body.shareCount, 1);
    const members = await api("POST", `/api/posts/${P.membersNotice}/share`, { as: "captain" });
    assert.equal(members.body.error.code, "members_only");
  });
});
