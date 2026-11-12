import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { api, prisma, resetDatabase, TEST_CLUBS, uid } from "./helpers";

const H = TEST_CLUBS.velloreHoopers;
const currentRoles = async (key: Parameters<typeof uid>[0]) =>
  (await prisma.clubRole.findMany({ where: { clubId: H, userId: uid(key), toAt: null } })).map((r) => r.role).sort();

describe("Club staff roles: owner, admin, captain (#14, #15, #44)", () => {
  before(resetDatabase);

  it("only the owner (or Basky team) makes someone an admin", async () => {
    for (const who of ["clubAdmin", "captain", "coach", "player", "districtAdmin", "moderator"] as const) {
      const res = await api("POST", `/api/clubs/${H}/roles`, { as: who, body: { userId: uid("player"), role: "admin" } });
      assert.equal(res.status, 403, who);
    }
    const ok = await api("POST", `/api/clubs/${H}/roles`, { as: "clubOwner", body: { userId: uid("player"), role: "admin" } });
    assert.equal(ok.status, 201);
    assert.deepEqual(await currentRoles("player"), ["admin"]);
    const dup = await api("POST", `/api/clubs/${H}/roles`, { as: "clubOwner", body: { userId: uid("player"), role: "admin" } });
    assert.equal(dup.body.error.code, "already_has_role");
  });

  it("owner or admin chooses a captain; the captain cannot", async () => {
    assert.equal((await api("POST", `/api/clubs/${H}/roles`, { as: "captain", body: { userId: uid("minorPlayer"), role: "captain" } })).status, 403);
    const ok = await api("POST", `/api/clubs/${H}/roles`, { as: "clubAdmin", body: { userId: uid("minorPlayer"), role: "captain" } });
    assert.equal(ok.status, 201);
  });

  it("roles only go to active members", async () => {
    const res = await api("POST", `/api/clubs/${H}/roles`, { as: "clubOwner", body: { userId: uid("normalUser"), role: "captain" } });
    assert.equal(res.body.error.code, "not_a_member");
    const owner = await api("POST", `/api/clubs/${H}/roles`, { as: "clubOwner", body: { userId: uid("player"), role: "owner" } });
    assert.equal(owner.status, 400); // owner only via transfer
  });

  it("ending roles: self steps down; owner ends an admin; admins can't end each other", async () => {
    const playerAdmin = await prisma.clubRole.findFirstOrThrow({ where: { clubId: H, userId: uid("player"), role: "admin", toAt: null } });
    assert.equal((await api("DELETE", `/api/club-roles/${playerAdmin.id}`, { as: "clubAdmin" })).status, 403);
    assert.equal((await api("DELETE", `/api/club-roles/${playerAdmin.id}`, { as: "player" })).status, 200);
    assert.deepEqual(await currentRoles("player"), []);
    // History kept: the ended row is still there
    assert.equal(await prisma.clubRole.count({ where: { clubId: H, userId: uid("player"), role: "admin" } }), 1);

    const juniorCaptain = await prisma.clubRole.findFirstOrThrow({ where: { clubId: H, userId: uid("minorPlayer"), role: "captain", toAt: null } });
    assert.equal((await api("DELETE", `/api/club-roles/${juniorCaptain.id}`, { as: "clubAdmin" })).status, 200);
    assert.equal((await api("DELETE", `/api/club-roles/${juniorCaptain.id}`, { as: "clubAdmin" })).status, 404);

    const ownerRole = await prisma.clubRole.findFirstOrThrow({ where: { clubId: H, role: "owner", toAt: null } });
    assert.equal((await api("DELETE", `/api/club-roles/${ownerRole.id}`, { as: "clubOwner" })).body.error.code, "use_transfer");
  });

  it("the database allows only one current owner", async () => {
    await assert.rejects(
      prisma.clubRole.create({ data: { clubId: H, userId: uid("player"), role: "owner" } }),
      /Unique constraint/,
    );
  });

  it("transfer ownership: not to an under-18 or non-member; owner becomes admin", async () => {
    const notOwner = await api("POST", `/api/clubs/${H}/transfer-ownership`, { as: "clubAdmin", body: { newOwnerUserId: uid("clubAdmin") } });
    assert.equal(notOwner.body.error.code, "owner_only");
    const minor = await api("POST", `/api/clubs/${H}/transfer-ownership`, { as: "clubOwner", body: { newOwnerUserId: uid("minorPlayer") } });
    assert.equal(minor.body.error.code, "adult_required");
    const outsider = await api("POST", `/api/clubs/${H}/transfer-ownership`, { as: "clubOwner", body: { newOwnerUserId: uid("normalUser") } });
    assert.equal(outsider.body.error.code, "not_a_member");

    const ok = await api("POST", `/api/clubs/${H}/transfer-ownership`, { as: "clubOwner", body: { newOwnerUserId: uid("clubAdmin") } });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.deepEqual(await currentRoles("clubAdmin"), ["owner"]); // admin role replaced by owner
    assert.deepEqual(await currentRoles("clubOwner"), ["admin"]); // old owner kept on as admin
    // Old owner can now leave
    assert.equal((await api("POST", `/api/clubs/${H}/leave`, { as: "clubOwner" })).status, 200);
    assert.deepEqual(await currentRoles("clubOwner"), []);
    const log = await prisma.changeLog.findFirst({ where: { entity: "clubs", entityId: H, action: "update" }, orderBy: { at: "desc" } });
    assert.deepEqual(log?.afterValue, { owner: uid("clubAdmin") });
  });

  it("the Basky team can hand a club over (e.g. the owner left BaskyCLub)", async () => {
    const ok = await api("POST", `/api/clubs/${H}/transfer-ownership`, {
      as: "baskyTeam",
      body: { newOwnerUserId: uid("coach"), keepAsAdmin: false },
    });
    assert.equal(ok.status, 200);
    assert.deepEqual(await currentRoles("coach"), ["owner"]);
    assert.deepEqual(await currentRoles("clubAdmin"), []);
  });

  it("association office bearers have no power inside a club", async () => {
    for (const who of ["tnbaAdmin", "districtAdmin", "associationMember"] as const) {
      const res = await api("POST", `/api/clubs/${H}/roles`, { as: who, body: { userId: uid("minorPlayer"), role: "captain" } });
      assert.equal(res.status, 403, who);
    }
  });
});
