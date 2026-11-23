import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { api, prisma, resetDatabase, TEST_POSTS, uid } from "./helpers";

const P = TEST_POSTS;
const likeCount = async (id: string) => (await prisma.post.findUniqueOrThrow({ where: { id } })).likeCount;
const commentCount = async (id: string) => (await prisma.post.findUniqueOrThrow({ where: { id } })).commentCount;

describe("Likes and comments (REQUIREMENTS section 8)", () => {
  before(resetDatabase);

  it("like: once per person, count kept by the database, unlike lowers it", async () => {
    const before = await likeCount(P.tnbaNews);
    const a = await api("POST", `/api/posts/${P.tnbaNews}/like`, { as: "player" });
    assert.deepEqual(a.body, { liked: true, likeCount: before + 1 });
    const again = await api("POST", `/api/posts/${P.tnbaNews}/like`, { as: "player" });
    assert.equal(again.body.likeCount, before + 1); // double tap ignored
    await api("POST", `/api/posts/${P.tnbaNews}/like`, { as: "minorPlayer" }); // under-18 can like (#74)
    assert.equal(await likeCount(P.tnbaNews), before + 2);
    const un = await api("DELETE", `/api/posts/${P.tnbaNews}/like`, { as: "player" });
    assert.equal(un.body.likeCount, before + 1);
  });

  it("who can't like: visitor, limited under-18, posts they can't see or still in review", async () => {
    assert.equal((await api("POST", `/api/posts/${P.tnbaNews}/like`)).status, 401);
    assert.equal((await api("POST", `/api/posts/${P.tnbaNews}/like`, { as: "minorAwaitingParent" })).body.error.code, "awaiting_parent");
    assert.equal((await api("POST", `/api/posts/${P.membersNotice}/like`, { as: "normalUser" })).status, 404);
    assert.equal((await api("POST", `/api/posts/${P.noClubInReview}/like`, { as: "normalUser" })).body.error.code, "not_published");
  });

  it("comment list: top-level first, reply counts, 'Comment removed' kept only when it has replies", async () => {
    const res = await api("GET", `/api/posts/${P.creatorDrill}/comments`);
    assert.equal(res.status, 200);
    assert.equal(res.body.comments.length, 2);
    assert.equal(res.body.comments[0].user.name, "Priya Player");
    assert.equal(res.body.comments[0].replyCount, 2);
    assert.equal(res.body.comments[1].replyCount, 0);

    const photos = await api("GET", `/api/posts/${P.playerPhotos}/comments`);
    const removed = photos.body.comments[0];
    assert.equal(removed.isRemoved, true);
    assert.equal(removed.content, null);
    assert.equal(removed.user, null);
    assert.equal(removed.replyCount, 1);

    const replies = await api("GET", `/api/comments/${res.body.comments[0].id}/replies`);
    assert.deepEqual(replies.body.replies.map((r: { user: { name: string } }) => r.user.name), ["Hari HoopsCreator", "Rahul Junior (16)"]);
  });

  it("comments are not readable on posts you can't see", async () => {
    assert.equal((await api("GET", `/api/posts/${P.membersNotice}/comments`)).status, 404);
    assert.equal((await api("GET", `/api/posts/${P.membersNotice}/comments`, { as: "player" })).status, 200);
  });

  let topId = "";
  let replyId = "";

  it("comment, reply, and reply-to-reply (same level, starts with @Name); count goes up", async () => {
    const start = await commentCount(P.tnbaNews);
    const top = await api("POST", `/api/posts/${P.tnbaNews}/comments`, { as: "coach", body: { content: "Which venue?" } });
    assert.equal(top.status, 201);
    topId = top.body.id;
    const reply = await api("POST", `/api/posts/${P.tnbaNews}/comments`, { as: "tnbaAdmin", body: { content: "Chennai, Nehru indoor.", parentId: topId } });
    assert.equal(reply.body.parentId, topId);
    replyId = reply.body.id;
    const deeper = await api("POST", `/api/posts/${P.tnbaNews}/comments`, { as: "captain", body: { content: "Thanks!", parentId: replyId } });
    assert.equal(deeper.body.parentId, topId); // flattened to one level
    assert.equal(deeper.body.content, "@Thiru TNBA Secretary Thanks!");
    assert.equal(await commentCount(P.tnbaNews), start + 3);
  });

  it("the database also refuses a reply nested two levels deep", async () => {
    await assert.rejects(
      prisma.postComment.create({ data: { postId: P.tnbaNews, userId: uid("player"), parentId: replyId, content: "deep" } }),
    );
  });

  it("delete: commenter, post author or moderator; count goes down; can't reply to a removed comment", async () => {
    const start = await commentCount(P.tnbaNews);
    assert.equal((await api("DELETE", `/api/comments/${replyId}`, { as: "player" })).status, 403);
    assert.equal((await api("DELETE", `/api/comments/${replyId}`, { as: "tnbaAdmin" })).status, 200); // own comment
    assert.equal(await commentCount(P.tnbaNews), start - 1);
    // Post author (tnbaAdmin) removes the coach's comment on their post
    assert.equal((await api("DELETE", `/api/comments/${topId}`, { as: "tnbaAdmin" })).status, 200);
    const replyToGone = await api("POST", `/api/posts/${P.tnbaNews}/comments`, { as: "player", body: { content: "?", parentId: topId } });
    assert.equal(replyToGone.body.error.code, "comment_removed");
    assert.equal((await api("DELETE", `/api/comments/${topId}`, { as: "moderator" })).status, 404); // already gone
  });

  it("spam limit: 5 comments a minute", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await api("POST", `/api/posts/${P.clubHighlights}/comments`, { as: "joiner", body: { content: `c${i}` } });
      assert.equal(r.status, 201);
    }
    const sixth = await api("POST", `/api/posts/${P.clubHighlights}/comments`, { as: "joiner", body: { content: "c6" } });
    assert.equal(sixth.status, 429);
    assert.equal(sixth.body.error.code, "slow_down");
  });

  it("comments page 20 at a time", async () => {
    const list = await api("GET", `/api/posts/${P.clubHighlights}/comments?limit=3`);
    assert.equal(list.body.comments.length, 3);
    const next = await api("GET", `/api/posts/${P.clubHighlights}/comments?limit=3&cursor=${list.body.nextCursor}`);
    assert.equal(next.body.comments.length, 2);
    assert.equal(next.body.nextCursor, null);
  });
});
