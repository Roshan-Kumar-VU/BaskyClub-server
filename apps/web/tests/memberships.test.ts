import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { api, prisma, resetDatabase, TEST_CLUBS, uid } from "./helpers";

const H = TEST_CLUBS.velloreHoopers;
const membershipOf = (key: Parameters<typeof uid>[0], status = "active") =>
  prisma.clubMembership.findFirstOrThrow({ where: { clubId: H, userId: uid(key), status } });

describe("Joining and leaving a club (#17, #63)", () => {
  before(resetDatabase);

  it("join requests are visible to the owner and admins only", async () => {
    for (const who of ["clubOwner", "clubAdmin", "baskyTeam"] as const) {
      const res = await api("GET", `/api/clubs/${H}/requests`, { as: who });
      assert.equal(res.status, 200, who);
      assert.deepEqual(res.body.requests.map((r: { user: { name: string } }) => r.user.name), ["Joel Joiner"]);
    }
    for (const who of ["captain", "coach", "player", "joiner", "districtAdmin", "moderator"] as const) {
      assert.equal((await api("GET", `/api/clubs/${H}/requests`, { as: who })).status, 403, who);
    }
    assert.equal((await api("GET", `/api/clubs/${H}/requests`)).status, 401);
  });

  it("captain, coach and players cannot accept requests; an admin can", async () => {
    const request = await membershipOf("joiner", "pending");
    for (const who of ["captain", "coach", "player", "joiner"] as const) {
      assert.equal((await api("POST", `/api/memberships/${request.id}/approve`, { as: who })).status, 403, who);
    }
    const ok = await api("POST", `/api/memberships/${request.id}/approve`, { as: "clubAdmin" });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.status, "active");
    const row = await prisma.clubMembership.findUniqueOrThrow({ where: { id: request.id } });
    assert.ok(row.joinedAt);
    assert.equal(row.approvedById, uid("clubAdmin"));
    // Handling it twice is refused
    assert.equal((await api("POST", `/api/memberships/${request.id}/approve`, { as: "clubOwner" })).body.error.code, "not_pending");
  });

  it("members can't ask to join again; double requests are refused", async () => {
    const member = await api("POST", `/api/clubs/${H}/join`, { as: "player", body: {} });
    assert.equal(member.status, 409);
    assert.equal(member.body.error.code, "already_member");

    const first = await api("POST", `/api/clubs/${H}/join`, { as: "creator", body: { isPlayer: true, primaryPosition: "SG" } });
    assert.equal(first.status, 201);
    const second = await api("POST", `/api/clubs/${H}/join`, { as: "creator", body: {} });
    assert.equal(second.body.error.code, "already_requested");
  });

  it("the database itself blocks two open rows, even if the API check is skipped", async () => {
    await assert.rejects(
      prisma.clubMembership.create({ data: { clubId: H, userId: uid("creator"), status: "pending" } }),
      /Unique constraint/,
    );
  });

  it("withdraw a request, and the owner can reject one", async () => {
    assert.equal((await api("DELETE", `/api/clubs/${H}/join`, { as: "creator" })).status, 200);
    assert.equal((await api("DELETE", `/api/clubs/${H}/join`, { as: "creator" })).status, 404);

    await api("POST", `/api/clubs/${H}/join`, { as: "associationMember", body: { isPlayer: false } });
    const req = await membershipOf("associationMember", "pending");
    const res = await api("POST", `/api/memberships/${req.id}/reject`, { as: "clubOwner" });
    assert.equal(res.body.status, "rejected");
  });

  it("rejoining after leaving makes a new row; the old one stays as history", async () => {
    // normalUser left Vellore Hoopers last year (seed)
    const res = await api("POST", `/api/clubs/${H}/join`, { as: "normalUser", body: { isPlayer: true, primaryPosition: "C" } });
    assert.equal(res.status, 201);
    await api("POST", `/api/memberships/${res.body.id}/approve`, { as: "clubOwner" });
    const rows = await prisma.clubMembership.findMany({ where: { clubId: H, userId: uid("normalUser") }, orderBy: { requestedAt: "asc" } });
    assert.deepEqual(rows.map((r) => r.status), ["left", "active"]);
  });

  it("cannot join a club that is waiting for approval, or as a visitor or limited under-18", async () => {
    // Fresh pending club
    const club = await api("POST", "/api/clubs", { as: "player", body: { name: "Arcot Arrows", districtCode: "TN-RANIPET" } });
    assert.equal((await api("POST", `/api/clubs/${club.body.id}/join`, { as: "creator", body: {} })).status, 404);
    assert.equal((await api("POST", `/api/clubs/${H}/join`, { body: {} })).status, 401);
    const limited = await api("POST", `/api/clubs/${H}/join`, { as: "minorAwaitingParent", body: {} });
    assert.equal(limited.body.error.code, "awaiting_parent");
  });

  it("a confirmed under-18 can join like anyone else (#74)", async () => {
    const res = await api("POST", `/api/clubs/${TEST_CLUBS.velloreAcademy}/join`, { as: "minorPlayer", body: { primaryPosition: "C" } });
    assert.equal(res.status, 201);
  });

  it("member edits own position; only staff can mark coach/referee", async () => {
    const me = await membershipOf("player");
    const own = await api("PATCH", `/api/memberships/${me.id}`, { as: "player", body: { primaryPosition: "PF" } });
    assert.equal(own.status, 200);
    assert.equal(own.body.primaryPosition, "PF");
    const selfCoach = await api("PATCH", `/api/memberships/${me.id}`, { as: "player", body: { isCoach: true } });
    assert.equal(selfCoach.status, 403);
    const other = await api("PATCH", `/api/memberships/${me.id}`, { as: "captain", body: { primaryPosition: "C" } });
    assert.equal(other.status, 403);
    const staff = await api("PATCH", `/api/memberships/${me.id}`, { as: "clubAdmin", body: { isReferee: true } });
    assert.equal(staff.body.isReferee, true);
    // Not a player → no position
    const notPlayer = await api("PATCH", `/api/memberships/${me.id}`, { as: "player", body: { isPlayer: false } });
    assert.equal(notPlayer.body.primaryPosition, null);
    await api("PATCH", `/api/memberships/${me.id}`, { as: "player", body: { isPlayer: true, primaryPosition: "SF" } });
  });

  it("members list is public and shows roles", async () => {
    const res = await api("GET", `/api/clubs/${H}/members`);
    assert.equal(res.status, 200);
    const arun = res.body.members.find((m: { user: { name: string } }) => m.user.name === "Arun Captain");
    assert.deepEqual(arun.roles, ["captain"]);
    assert.equal(arun.primaryPosition, "PG");
    assert.doesNotMatch(JSON.stringify(res.body), /@test\.baskyclub\.in|\+9190000/);
  });

  it("removing members: admin removes a player; only the owner removes an admin; nobody removes the owner", async () => {
    const joiner = await membershipOf("joiner");
    assert.equal((await api("DELETE", `/api/memberships/${joiner.id}`, { as: "captain" })).status, 403);
    assert.equal((await api("DELETE", `/api/memberships/${joiner.id}`, { as: "clubAdmin" })).status, 200);
    assert.equal((await prisma.clubMembership.findUniqueOrThrow({ where: { id: joiner.id } })).status, "removed");

    // Second admin, then try admin-removes-admin
    const creatorJoin = await api("POST", `/api/clubs/${H}/join`, { as: "creator", body: {} });
    await api("POST", `/api/memberships/${creatorJoin.body.id}/approve`, { as: "clubOwner" });
    await api("POST", `/api/clubs/${H}/roles`, { as: "clubOwner", body: { userId: uid("creator"), role: "admin" } });
    const adminRow = await membershipOf("clubAdmin");
    const byAdmin = await api("DELETE", `/api/memberships/${adminRow.id}`, { as: "creator" });
    assert.equal(byAdmin.body.error.code, "owner_only");

    const ownerRow = await membershipOf("clubOwner");
    assert.equal((await api("DELETE", `/api/memberships/${ownerRow.id}`, { as: "clubAdmin" })).body.error.code, "cannot_remove_owner");
    assert.equal((await api("DELETE", `/api/memberships/${adminRow.id}`, { as: "clubAdmin" })).body.error.code, "use_leave");

    // Owner removes the second admin: their admin role ends too
    const creatorRow = await membershipOf("creator");
    assert.equal((await api("DELETE", `/api/memberships/${creatorRow.id}`, { as: "clubOwner" })).status, 200);
    const openRoles = await prisma.clubRole.count({ where: { clubId: H, userId: uid("creator"), toAt: null } });
    assert.equal(openRoles, 0);
  });

  it("leaving: a player leaves; the captain's role ends when they leave; the owner must hand over first", async () => {
    assert.equal((await api("POST", `/api/clubs/${H}/leave`, { as: "player" })).status, 200);
    assert.equal((await api("POST", `/api/clubs/${H}/leave`, { as: "player" })).status, 404);

    assert.equal((await api("POST", `/api/clubs/${H}/leave`, { as: "captain" })).status, 200);
    const captainRole = await prisma.clubRole.findFirstOrThrow({ where: { clubId: H, userId: uid("captain"), role: "captain" } });
    assert.ok(captainRole.toAt, "captain role should be ended, not deleted");

    const owner = await api("POST", `/api/clubs/${H}/leave`, { as: "clubOwner" });
    assert.equal(owner.status, 409);
    assert.equal(owner.body.error.code, "owner_cannot_leave");
  });
});
