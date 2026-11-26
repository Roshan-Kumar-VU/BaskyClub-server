import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { pushOutbox } from "../src/server/lib/push";
import { api, prisma, resetDatabase, TEST_CLUBS, TEST_POSTS, uid, type TestUserKey } from "./helpers";

// PRD §6: "A reply to someone's comment notifies them through the same alerts system."
const P = TEST_POSTS;
const device = (n: number) => `ExponentPushToken[reply-test-${n}]`;

async function register(as: TestUserKey, n: number) {
  const res = await api("POST", "/api/devices", { as, body: { token: device(n), platform: "android" } });
  assert.ok(res.status === 200 || res.status === 201, JSON.stringify(res.body));
}
const comment = async (as: TestUserKey, postId: string, content: string, parentId?: string) => {
  const res = await api("POST", `/api/posts/${postId}/comments`, { as, body: { content, ...(parentId ? { parentId } : {}) } });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return res.body as { id: string; content: string };
};
const inbox = async (as: TestUserKey, q = "") => (await api("GET", `/api/alerts${q}`, { as })).body;
const replyAlerts = async (as: TestUserKey) =>
  (await inbox(as, "?limit=50")).alerts.filter((a: { type: string }) => a.type === "reply") as {
    id: string; title: string; body: string; postId: string; from: { type: string; id: string }; audience: null;
  }[];
const pushesTo = (n: number) => pushOutbox.filter((m) => m.to === device(n));

describe("Reply alerts (inbox + push)", () => {
  before(async () => {
    await resetDatabase();
    pushOutbox.length = 0;
    await register("player", 1);
    await register("coach", 2);
    await register("captain", 3);
  });

  it("a reply alerts the comment's author: in the inbox and as a push, linking to the post", async () => {
    const mine = await comment("player", P.clubHighlights, "Great highlights!");
    const reply = await comment("coach", P.clubHighlights, "Thanks, more next week", mine.id);

    const alerts = (await replyAlerts("player")).filter((a) => a.postId === P.clubHighlights);
    assert.equal(alerts.length, 1); // seed replies elsewhere don't matter here
    assert.equal(alerts[0].id, reply.id);
    assert.match(alerts[0].title, /replied to your comment$/);
    assert.equal(alerts[0].body, "Thanks, more next week");
    assert.equal(alerts[0].postId, P.clubHighlights);
    assert.equal(alerts[0].from.type, "user");
    assert.equal(alerts[0].from.id, uid("coach"));
    assert.equal(alerts[0].audience, null);

    assert.equal(pushesTo(1).length, 1);
    assert.deepEqual(pushesTo(1)[0].data, { type: "reply", postId: P.clubHighlights, commentId: reply.id });
    assert.equal(pushesTo(2).length, 0); // the replier gets nothing
  });

  it("no alert for replying to yourself or for a top-level comment", async () => {
    pushOutbox.length = 0;
    const mine = await comment("captain", P.clubHighlights, "Who's in for Sunday?");
    await comment("captain", P.clubHighlights, "Also Saturday", mine.id);
    assert.equal((await replyAlerts("captain")).length, 0);
    assert.equal(pushOutbox.length, 0);
  });

  it("reply to a reply: pushes to the person replied to and the thread's starter; the starter's inbox lists it", async () => {
    pushOutbox.length = 0;
    const top = await comment("player", P.playerPhotos, "Sunday 6am?");
    const r1 = await comment("coach", P.playerPhotos, "I'm in", top.id);
    const r2 = await comment("captain", P.playerPhotos, "me too", r1.id);
    assert.match(r2.content, /^@\S+.* me too$/);
    // push: coach (replied to) and player (thread) for r2; player for r1
    assert.equal(pushesTo(2).length, 1);
    assert.equal(pushesTo(1).length, 2);
    assert.equal(pushesTo(3).length, 0);
    const ids = (await replyAlerts("player")).map((a) => a.id);
    assert.ok(ids.includes(r1.id) && ids.includes(r2.id));
  });

  it("deleted, hidden or suspended replies stop alerting", async () => {
    const top = await comment("player", P.playerPhotos, "Court lights fixed?");
    const gone = await comment("coach", P.playerPhotos, "Yes", top.id);
    const hidden = await comment("captain", P.playerPhotos, "Not yet", top.id);
    assert.equal((await api("DELETE", `/api/comments/${gone.id}`, { as: "coach" })).status, 200);
    await prisma.postComment.update({ where: { id: hidden.id }, data: { moderationStatus: "hidden" } });
    const ids = (await replyAlerts("player")).map((a) => a.id);
    assert.ok(!ids.includes(gone.id) && !ids.includes(hidden.id));

    const before = (await replyAlerts("player")).length;
    await prisma.user.update({ where: { id: uid("coach") }, data: { status: "suspended" } });
    try {
      assert.ok((await replyAlerts("player")).length < before);
    } finally {
      await prisma.user.update({ where: { id: uid("coach") }, data: { status: "active" } });
    }
  });

  it("members-only posts: someone who left the club gets no alert and no push", async () => {
    const top = await comment("player", P.membersNotice, "Count me in");
    const m = await prisma.clubMembership.findFirstOrThrow({ where: { userId: uid("player"), clubId: TEST_CLUBS.velloreHoopers, status: "active" } });
    await prisma.clubMembership.update({ where: { id: m.id }, data: { status: "left" } });
    try {
      pushOutbox.length = 0;
      const reply = await comment("captain", P.membersNotice, "Great", top.id);
      assert.equal(pushesTo(1).length, 0);
      assert.ok(!(await replyAlerts("player")).some((a) => a.id === reply.id));
    } finally {
      await prisma.clubMembership.update({ where: { id: m.id }, data: { status: "active" } });
    }
    // Back in the club: the alert shows again
    assert.ok((await replyAlerts("player")).some((a) => a.postId === P.membersNotice));
  });

  it("one cursor pages through announcements and replies together: newest first, nothing lost or repeated", async () => {
    // An announcement to the player's club in between replies
    // (different people from the tests above: 5 comments a minute each)
    const top = await comment("clubAdmin", P.clubHighlights, "Paging check");
    await comment("minorPlayer", P.clubHighlights, "r-a", top.id);
    const ann = await api("POST", "/api/announcements", {
      as: "clubOwner",
      body: { senderClubId: TEST_CLUBS.velloreHoopers, audience: "club_members", title: "Practice moved", body: "Now at 7am", showInFeed: false },
    });
    assert.equal(ann.status, 201, JSON.stringify(ann.body));
    await comment("clubOwner", P.clubHighlights, "r-b", top.id);

    const all = (await inbox("clubAdmin", "?limit=50")).alerts as { id: string; sentAt: string; type: string }[];
    assert.ok(all.some((a) => a.type === "announcement") && all.some((a) => a.type === "reply"));
    for (let i = 1; i < all.length; i++) assert.ok(all[i - 1].sentAt >= all[i].sentAt, "newest first");

    const seen: string[] = [];
    let cursor: string | null = null;
    do {
      const page = await inbox("clubAdmin", `?limit=2${cursor ? `&cursor=${cursor}` : ""}`);
      assert.ok(page.alerts.length <= 2);
      seen.push(...page.alerts.map((a: { id: string }) => a.id));
      cursor = page.nextCursor;
    } while (cursor);
    assert.deepEqual(seen, all.map((a) => a.id));
  });

  it("the Sent box shows only announcements you sent; visitors have no inbox", async () => {
    const sent = (await inbox("clubOwner", "?box=sent")).alerts as { type: string }[];
    assert.ok(sent.length > 0 && sent.every((a) => a.type === "announcement"));
    assert.equal((await api("GET", "/api/alerts")).status, 401);
  });
});
