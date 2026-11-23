import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { api, prisma, resetDatabase, TEST_CLUBS, TEST_ORGS } from "./helpers";

const V = TEST_ORGS.velloreDba;
const ACADEMY = TEST_CLUBS.velloreAcademy;
const H = TEST_CLUBS.velloreHoopers;
const K = TEST_CLUBS.katpadiBallers;

describe("Affiliations: a club's yearly link to its association (#58, #69)", () => {
  before(resetDatabase);

  let requestId = "";

  it("club staff ask their district association; duplicates refused; wrong association refused", async () => {
    assert.equal((await api("POST", `/api/clubs/${ACADEMY}/affiliations`, { as: "player", body: { organizationId: V } })).status, 403);
    const res = await api("POST", `/api/clubs/${ACADEMY}/affiliations`, { as: "coach", body: { organizationId: V } });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, "pending");
    requestId = res.body.id;
    assert.equal((await api("POST", `/api/clubs/${ACADEMY}/affiliations`, { as: "coach", body: { organizationId: V } })).body.error.code, "already_requested");
    assert.equal((await api("POST", `/api/clubs/${ACADEMY}/affiliations`, { as: "coach", body: { organizationId: TEST_ORGS.chennaiDba } })).body.error.code, "wrong_association");
    // The state body covers the whole state
    assert.equal((await api("POST", `/api/clubs/${ACADEMY}/affiliations`, { as: "coach", body: { organizationId: TEST_ORGS.tnba } })).status, 201);
  });

  it("the association decides club requests — not the club, not association members without staff rights", async () => {
    assert.equal((await api("POST", `/api/affiliations/${requestId}/decide`, { as: "coach", body: { decision: "approve" } })).status, 403);
    assert.equal((await api("POST", `/api/affiliations/${requestId}/decide`, { as: "associationMember", body: { decision: "approve" } })).status, 403);
    const pending = await api("GET", `/api/associations/${V}/affiliations?status=pending`, { as: "districtAdmin" });
    assert.equal(pending.body.affiliations[0].club.name, "Vellore Basketball Academy");

    const ok = await api("POST", `/api/affiliations/${requestId}/decide`, { as: "districtAdmin", body: { decision: "approve", tnbaNumber: "TNBA/VLR/0002" } });
    assert.equal(ok.body.status, "active");
    assert.equal(new Date(ok.body.validUntil).getUTCMonth(), 2); // 31 March
    assert.equal(new Date(ok.body.validUntil).getUTCDate(), 31);
    const club = await api("GET", `/api/clubs/${ACADEMY}`);
    assert.equal(club.body.affiliatedTo.shortName, "Vellore DBA");
    const org = await api("GET", `/api/associations/${V}`);
    assert.equal(org.body.affiliatedClubs.length, 2);
  });

  it("renewal: an active link blocks a new request; once expired, a new request closes the old one", async () => {
    assert.equal((await api("POST", `/api/clubs/${H}/affiliations`, { as: "clubOwner", body: { organizationId: V } })).body.error.code, "already_affiliated");
    await prisma.affiliation.updateMany({ where: { clubId: H, organizationId: V, status: "active" }, data: { validUntil: new Date("2025-03-31") } });
    const renew = await api("POST", `/api/clubs/${H}/affiliations`, { as: "clubAdmin", body: { organizationId: V } });
    assert.equal(renew.status, 201);
    const rows = await prisma.affiliation.findMany({ where: { clubId: H, organizationId: V }, orderBy: { createdAt: "asc" } });
    assert.deepEqual(rows.map((r) => r.status), ["ended", "pending"]);
  });

  it("the association invites a club; the club accepts", async () => {
    await api("POST", `/api/clubs/${K}/review`, { as: "baskyTeam", body: { decision: "approve" } });
    const invite = await api("POST", `/api/associations/${V}/affiliations`, { as: "districtAdmin", body: { clubId: K, validFrom: "2026-04-01", validUntil: "2027-03-31" } });
    assert.equal(invite.status, 201);
    assert.equal((await api("POST", `/api/affiliations/${invite.body.id}/decide`, { as: "districtAdmin", body: { decision: "approve" } })).status, 403);
    const accept = await api("POST", `/api/affiliations/${invite.body.id}/decide`, { as: "pendingClubOwner", body: { decision: "approve" } });
    assert.equal(accept.body.status, "active");
    assert.equal(accept.body.validUntil.slice(0, 10), "2027-03-31");
  });

  it("either side can end it; the badge goes; lists are staff-only", async () => {
    const academyLink = await prisma.affiliation.findFirstOrThrow({ where: { clubId: ACADEMY, organizationId: V, status: "active" } });
    assert.equal((await api("POST", `/api/affiliations/${academyLink.id}/end`, { as: "player" })).status, 403);
    assert.equal((await api("POST", `/api/affiliations/${academyLink.id}/end`, { as: "coach" })).status, 200);
    assert.equal((await api("GET", `/api/clubs/${ACADEMY}`)).body.affiliatedTo, null); // TNBA request still pending → "Community club"
    const clubList = await api("GET", `/api/clubs/${ACADEMY}/affiliations`, { as: "coach" });
    assert.ok(clubList.body.affiliations.some((a: { status: string }) => a.status === "ended"));
    assert.equal((await api("GET", `/api/clubs/${ACADEMY}/affiliations`, { as: "player" })).status, 403);
    assert.equal((await api("GET", `/api/associations/${V}/affiliations`, { as: "associationMember" })).status, 403);
    // The rejected path
    const req = await api("POST", `/api/clubs/${ACADEMY}/affiliations`, { as: "coach", body: { organizationId: V } });
    const no = await api("POST", `/api/affiliations/${req.body.id}/decide`, { as: "districtAdmin", body: { decision: "reject" } });
    assert.equal(no.body.status, "rejected");
    assert.equal((await api("GET", `/api/clubs/${ACADEMY}`)).body.affiliatedTo, null);
  });
});
