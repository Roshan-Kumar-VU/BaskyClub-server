import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { pushOutbox } from "../src/server/lib/push";
import { api, prisma, resetDatabase, uid } from "./helpers";

const NISHA = "0000000a-0000-4000-8000-000000000015"; // normalUser, adult, no club

describe("Request a Creator badge", () => {
  before(resetDatabase);

  it("an adult asks; it waits for the team and gives no Creator powers yet", async () => {
    assert.equal((await api("GET", "/api/badges/creator", { as: "normalUser" })).body.status, "none");
    const r = await api("POST", "/api/badges/creator", { as: "normalUser" });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.status, "requested");
    const me = await api("GET", "/api/auth/me", { as: "normalUser" });
    assert.equal(me.body.creatorBadge.status, "requested");
    // asking twice
    assert.equal((await api("POST", "/api/badges/creator", { as: "normalUser" })).body.error.code, "already_requested");
    // a request is not a badge
    const badges = await prisma.verificationBadge.count({ where: { userId: uid("normalUser"), badge: "creator", status: "active" } });
    assert.equal(badges, 0);
  });

  it("only the Basky team sees the queue, with followers and posts to judge by", async () => {
    const list = await api("GET", "/api/admin/badges/requests", { as: "baskyTeam" });
    assert.equal(list.status, 200);
    const req = list.body.requests.find((r: { person: { id: string } }) => r.person.id === NISHA);
    assert.ok(req, "Nisha's request is listed");
    for (const k of ["followers", "posts", "bio", "instagram", "youtube"]) assert.ok(k in req.person, `has ${k}`);
    assert.ok(!("email" in req.person) && !("phone" in req.person), "no private details");
    assert.equal((await api("GET", "/api/admin/badges/requests", { as: "moderator" })).status, 403);
    assert.equal((await api("GET", "/api/admin/badges/requests", { as: "player" })).status, 403);
    assert.equal((await api("GET", "/api/admin/badges/requests")).status, 401);
  });

  it("declining needs a reason; the person sees it, gets an alert, and waits 30 days", async () => {
    await api("POST", "/api/devices", { as: "normalUser", body: { token: "ExponentPushToken[nisha-test]", platform: "android" } });
    const { requests } = (await api("GET", "/api/admin/badges/requests", { as: "baskyTeam" })).body;
    const id = requests.find((r: { person: { id: string } }) => r.person.id === NISHA).id;
    assert.equal((await api("POST", `/api/admin/badges/requests/${id}/decide`, { as: "moderator", body: { decision: "approve" } })).status, 403);
    assert.equal((await api("POST", `/api/admin/badges/requests/${id}/decide`, { as: "baskyTeam", body: { decision: "decline" } })).body.error.code, "note_needed");

    const from = pushOutbox.length;
    const d = await api("POST", `/api/admin/badges/requests/${id}/decide`, { as: "baskyTeam", body: { decision: "decline", note: "Post a few more basketball videos first." } });
    assert.equal(d.body.status, "declined");
    assert.ok(pushOutbox.slice(from).some((m) => m.to === "ExponentPushToken[nisha-test]" && m.body.includes("basketball videos")));

    const s = (await api("GET", "/api/badges/creator", { as: "normalUser" })).body;
    assert.equal(s.status, "declined");
    assert.equal(s.note, "Post a few more basketball videos first.");
    assert.equal((await api("POST", "/api/badges/creator", { as: "normalUser" })).body.error.code, "ask_later");
    // deciding the same request again
    assert.equal((await api("POST", `/api/admin/badges/requests/${id}/decide`, { as: "baskyTeam", body: { decision: "approve" } })).status, 404);
  });

  it("after 30 days they can ask again; approval makes their posts go live straight away", async () => {
    await prisma.verificationBadge.updateMany({ where: { userId: NISHA, status: "declined" }, data: { verifiedAt: new Date(Date.now() - 31 * 86_400_000) } });
    assert.equal((await api("GET", "/api/badges/creator", { as: "normalUser" })).body.status, "none");
    const again = await api("POST", "/api/badges/creator", { as: "normalUser" });
    assert.equal(again.status, 201);
    const ok = await api("POST", `/api/admin/badges/requests/${again.body.requestId}/decide`, { as: "baskyTeam", body: { decision: "approve" } });
    assert.equal(ok.body.status, "active");
    assert.equal((await api("GET", "/api/badges/creator", { as: "normalUser" })).body.status, "active");
    const post = await api("POST", "/api/posts", { as: "normalUser", body: { content: "Creator now!", visibility: "public", images: [] } });
    assert.equal(post.body.moderationStatus, "published");
    const profile = await api("GET", `/api/users/${NISHA}`);
    assert.equal(profile.body.isCreator ?? profile.body.user?.isCreator, true);
    assert.equal((await api("POST", "/api/badges/creator", { as: "normalUser" })).body.error.code, "already_creator");
  });

  it("under-18s and accounts waiting for a parent can't ask", async () => {
    assert.equal((await api("POST", "/api/badges/creator", { as: "minorPlayer" })).body.error.code, "adults_only");
    assert.equal((await api("POST", "/api/badges/creator", { as: "minorAwaitingParent" })).body.error.code, "awaiting_parent");
    assert.equal((await api("POST", "/api/badges/creator")).status, 401);
  });

  it("a request can be withdrawn", async () => {
    assert.equal((await api("POST", "/api/badges/creator", { as: "joiner" })).status, 201);
    assert.equal((await api("DELETE", "/api/badges/creator", { as: "joiner" })).status, 200);
    assert.equal((await api("GET", "/api/badges/creator", { as: "joiner" })).body.status, "none");
    assert.equal((await api("DELETE", "/api/badges/creator", { as: "joiner" })).status, 404);
  });

  it("giving the badge directly from Admin closes an open request; team members can't approve themselves", async () => {
    assert.equal((await api("POST", "/api/badges/creator", { as: "captain" })).status, 201);
    const captainId = "0000000a-0000-4000-8000-000000000009";
    assert.equal((await api("POST", "/api/admin/badges", { as: "baskyTeam", body: { badge: "creator", userId: captainId } })).status, 201);
    const rows = await prisma.verificationBadge.findMany({ where: { userId: captainId, badge: "creator" } });
    assert.deepEqual(rows.map((r) => r.status), ["active"]);

    const own = await api("POST", "/api/badges/creator", { as: "baskyTeam" });
    assert.equal(own.status, 201);
    assert.equal((await api("POST", `/api/admin/badges/requests/${own.body.requestId}/decide`, { as: "baskyTeam", body: { decision: "approve" } })).body.error.code, "own_request");
    assert.equal((await api("POST", `/api/admin/badges/requests/${own.body.requestId}/decide`, { as: "superAdmin", body: { decision: "approve" } })).status, 200);
  });
});
