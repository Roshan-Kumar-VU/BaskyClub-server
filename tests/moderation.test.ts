import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { api, prisma, resetDatabase, TEST_CLUBS, TEST_POSTS, uid, type TestUserKey } from "./helpers";

const P = TEST_POSTS;

describe("Review queue and reports (#25, #41)", () => {
  before(resetDatabase);

  it("only moderators, the Basky team and super admins see the queue", async () => {
    for (const who of ["moderator", "baskyTeam", "superAdmin"] as const) {
      const res = await api("GET", "/api/moderation/cases", { as: who });
      assert.equal(res.status, 200, who);
      assert.equal(res.body.cases.length, 1);
      assert.equal(res.body.cases[0].target.id, P.noClubInReview);
    }
    const notMods: TestUserKey[] = ["clubOwner", "districtAdmin", "tnbaAdmin", "creator", "player"];
    for (const who of notMods) assert.equal((await api("GET", "/api/moderation/cases", { as: who })).status, 403, who);
  });

  it("a moderator approves a no-club post → it appears in the feed; the decision is logged", async () => {
    const kase = await prisma.moderationCase.findFirstOrThrow({ where: { targetId: P.noClubInReview } });
    // It waited 3 days in review
    await prisma.post.update({ where: { id: P.noClubInReview }, data: { createdAt: new Date(Date.now() - 3 * 86_400_000) } });
    assert.equal((await api("POST", `/api/moderation/cases/${kase.id}/decide`, { as: "clubOwner", body: { decision: "approve" } })).status, 403);
    const ok = await api("POST", `/api/moderation/cases/${kase.id}/decide`, { as: "moderator", body: { decision: "approve", note: "Fine" } });
    assert.equal(ok.body.status, "approved");
    const feed = await api("GET", "/api/feed");
    // It goes live now, so it's the newest post at the top of the feed (not 3 days down)
    assert.equal(feed.body.posts[0].id, P.noClubInReview);
    const live = await prisma.post.findUniqueOrThrow({ where: { id: P.noClubInReview } });
    assert.ok(Date.now() - live.createdAt.getTime() < 60_000);
    const log = await prisma.changeLog.findFirst({ where: { entity: "posts", entityId: P.noClubInReview } });
    assert.equal(log?.actorId, uid("moderator"));
    const twice = await api("POST", `/api/moderation/cases/${kase.id}/decide`, { as: "moderator", body: { decision: "remove" } });
    assert.equal(twice.body.error.code, "already_decided");
  });

  it("reports: anyone logged in; one open report per person per item; visitors can't", async () => {
    const r1 = await api("POST", "/api/reports", { as: "player", body: { targetType: "post", targetId: P.juniorPost, reason: "Unsafe stunt" } });
    assert.equal(r1.status, 201);
    const r2 = await api("POST", "/api/reports", { as: "player", body: { targetType: "post", targetId: P.juniorPost, reason: "Again" } });
    assert.equal(r2.body.caseId, r1.body.caseId);
    await api("POST", "/api/reports", { as: "coach", body: { targetType: "post", targetId: P.juniorPost, reason: "Unsafe" } });
    assert.equal((await api("POST", "/api/reports", { body: { targetType: "post", targetId: P.juniorPost, reason: "x x x" } })).status, 401);
    assert.equal((await api("POST", "/api/reports", { as: "player", body: { targetType: "post", targetId: uid("player"), reason: "missing" } })).status, 404);
  });

  it("removing a reported post closes every report about it and hides it from everyone but its author", async () => {
    const kase = await prisma.moderationCase.findFirstOrThrow({ where: { targetId: P.juniorPost, status: "open" } });
    await api("POST", `/api/moderation/cases/${kase.id}/decide`, { as: "baskyTeam", body: { decision: "remove", note: "Safety" } });
    assert.equal(await prisma.moderationCase.count({ where: { targetId: P.juniorPost, status: "open" } }), 0);
    assert.equal(await prisma.moderationCase.count({ where: { targetId: P.juniorPost, status: "removed" } }), 2);
    assert.equal((await api("GET", `/api/posts/${P.juniorPost}`)).status, 404);
    assert.equal((await api("GET", `/api/posts/${P.juniorPost}`, { as: "minorPlayer" })).body.moderationStatus, "removed");
    // The author can't edit a removed post back into the feed
    const edit = await api("PATCH", `/api/posts/${P.juniorPost}`, { as: "minorPlayer", body: { content: "new" } });
    assert.equal(edit.body.error.code, "removed");
  });

  it("removing a reported comment shows 'Comment removed' and lowers the count", async () => {
    const comment = await prisma.postComment.findFirstOrThrow({ where: { postId: P.creatorDrill, parentId: null, userId: uid("player") } });
    const before = (await prisma.post.findUniqueOrThrow({ where: { id: P.creatorDrill } })).commentCount;
    const r = await api("POST", "/api/reports", { as: "creator", body: { targetType: "comment", targetId: comment.id, reason: "Spam link" } });
    await api("POST", `/api/moderation/cases/${r.body.caseId}/decide`, { as: "moderator", body: { decision: "remove" } });
    const list = await api("GET", `/api/posts/${P.creatorDrill}/comments`);
    assert.equal(list.body.comments[0].isRemoved, true);
    assert.equal(list.body.comments[0].replyCount, 2);
    assert.equal((await prisma.post.findUniqueOrThrow({ where: { id: P.creatorDrill } })).commentCount, before - 1);
  });

  it("a reported person: moderators can dismiss, but suspending is a Basky-team admin tool", async () => {
    const r = await api("POST", "/api/reports", { as: "player", body: { targetType: "user", targetId: uid("joiner"), reason: "Fake account" } });
    const remove = await api("POST", `/api/moderation/cases/${r.body.caseId}/decide`, { as: "moderator", body: { decision: "remove" } });
    assert.equal(remove.body.error.code, "use_admin_tools");
    const dismiss = await api("POST", `/api/moderation/cases/${r.body.caseId}/decide`, { as: "moderator", body: { decision: "approve" } });
    assert.equal(dismiss.body.status, "approved");
  });

  it("keeping a reported post (already live) doesn't move it in the feed", async () => {
    const target = await prisma.post.findFirstOrThrow({ where: { moderationStatus: "published", deletedAt: null, visibility: "public", authorId: { not: uid("normalUser") } }, orderBy: { createdAt: "asc" } });
    const r = await api("POST", "/api/reports", { as: "normalUser", body: { targetType: "post", targetId: target.id, reason: "spam" } });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    await api("POST", `/api/moderation/cases/${r.body.caseId}/decide`, { as: "moderator", body: { decision: "approve" } });
    const after = await prisma.post.findUniqueOrThrow({ where: { id: target.id } });
    assert.equal(after.createdAt.getTime(), target.createdAt.getTime());
  });

  it("club staff have no moderation powers (they report like anyone else)", async () => {
    const r = await api("POST", "/api/reports", { as: "clubOwner", body: { targetType: "post", targetId: P.trialsClubPage, reason: "Wrong date" } });
    assert.equal((await api("POST", `/api/moderation/cases/${r.body.caseId}/decide`, { as: "clubOwner", body: { decision: "remove" } })).status, 403);
    assert.equal((await api("GET", `/api/clubs/${TEST_CLUBS.velloreHoopers}/posts`)).body.posts.length, 2);
  });
});
