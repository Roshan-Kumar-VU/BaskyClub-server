import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { practiceHours, type PracticeTime } from "@baskyclub/shared";
import { emailOutbox } from "../src/server/lib/mailer";
import { api, prisma, resetDatabase, TEST_CLUBS, TEST_PASSWORD, TEST_USERS } from "./helpers";

const H = TEST_CLUBS.velloreHoopers;
const FORT = { lat: 12.9165, lng: 79.1325 };

// Smallest valid PNG (1×1 pixel)
const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000" + "1f15c4890000000d49444154789c6300010000000500010d0a2db40000000049454e44ae426082", "hex");
const form = (bytes: Uint8Array, name = "photo.png") => {
  const f = new FormData();
  f.append("file", new Blob([bytes as BlobPart]), name);
  return f;
};

describe("Map, courts and practice hours", () => {
  before(resetDatabase);

  it("map near Vellore: approved clubs and courts with distance, nearest first; pending courts hidden", async () => {
    const res = await api("GET", `/api/map?lat=${FORT.lat}&lng=${FORT.lng}&radiusKm=25`);
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.clubs.map((c: { name: string }) => c.name), ["Vellore Hoopers", "Vellore Basketball Academy"]);
    assert.equal(res.body.clubs[0].distanceKm, 0);
    assert.deepEqual(res.body.courts.map((c: { name: string }) => c.name), ["Vellore Hoopers Court"]);
    assert.equal((await api("GET", `/api/map?lat=13.08&lng=80.27&radiusKm=10`)).body.clubs.length, 0); // Chennai
    assert.equal((await api("GET", "/api/map?districtCode=TN-VELLORE")).body.clubs.length, 2);
    assert.equal((await api("GET", "/api/map")).status, 400);
  });

  let suggested = "";

  it("anyone can suggest a court; it waits for the Basky team; club courts need club staff", async () => {
    const res = await api("POST", "/api/courts", { as: "player", body: { name: "VIT Outdoor Court", districtCode: "TN-VELLORE", latitude: 12.9692, longitude: 79.1559, surface: "concrete" } });
    assert.equal(res.status, 201);
    assert.equal(res.body.status, "pending");
    suggested = res.body.id;
    assert.equal((await api("POST", "/api/courts", { as: "player", body: { name: "Club court", districtCode: "TN-VELLORE", clubId: H, latitude: 12.9, longitude: 79.1 } })).status, 403);
    assert.equal((await api("POST", "/api/courts", { body: { name: "x court", districtCode: "TN-VELLORE", latitude: 1, longitude: 1 } })).status, 401);
    // Only the suggester and the Basky team can see it before approval
    assert.equal((await api("GET", `/api/courts/${suggested}`)).status, 404);
    assert.equal((await api("GET", `/api/courts/${suggested}`, { as: "player" })).status, 200);
  });

  it("approval queue: the Basky team approves → it appears on the map", async () => {
    const queue = await api("GET", "/api/admin/courts", { as: "baskyTeam" });
    assert.equal(queue.body.courts.length, 2);
    assert.equal((await api("GET", "/api/admin/courts", { as: "moderator" })).status, 403);
    assert.equal((await api("POST", `/api/courts/${suggested}/review`, { as: "clubOwner", body: { decision: "approve" } })).status, 403);
    assert.equal((await api("POST", `/api/courts/${suggested}/review`, { as: "baskyTeam", body: { decision: "approve" } })).body.status, "approved");
    const res = await api("GET", `/api/map?lat=${FORT.lat}&lng=${FORT.lng}`);
    assert.ok(res.body.courts.some((c: { id: string }) => c.id === suggested));
  });

  it("editing courts: club staff for their club's court; suggester only while pending", async () => {
    const clubCourt = await prisma.court.findFirstOrThrow({ where: { clubId: H } });
    assert.equal((await api("PATCH", `/api/courts/${clubCourt.id}`, { as: "clubAdmin", body: { indoor: true } })).status, 200);
    assert.equal((await api("PATCH", `/api/courts/${clubCourt.id}`, { as: "player", body: { indoor: false } })).status, 403);
    assert.equal((await api("PATCH", `/api/courts/${suggested}`, { as: "player", body: { name: "VIT Court" } })).status, 403); // approved now
  });

  it("practice hours: club staff replace the weekly timetable", async () => {
    const body = { timings: [{ dayOfWeek: 2, morningStart: "06:00", morningEnd: "07:30" }, { dayOfWeek: 6, isFullDay: true }] };
    assert.equal((await api("PUT", `/api/clubs/${H}/timings`, { as: "captain", body })).status, 403);
    assert.equal((await api("PUT", `/api/clubs/${H}/timings`, { as: "clubAdmin", body })).status, 200);
    const page = await api("GET", `/api/clubs/${H}`);
    assert.deepEqual(page.body.timings.map((t: { dayOfWeek: number }) => t.dayOfWeek), [2, 6]);
    const dup = await api("PUT", `/api/clubs/${H}/timings`, { as: "clubAdmin", body: { timings: [{ dayOfWeek: 1 }, { dayOfWeek: 1 }] } });
    assert.equal(dup.body.error.code, "duplicate_day");
    const backwards = await api("PUT", `/api/clubs/${H}/timings`, { as: "clubAdmin", body: { timings: [{ dayOfWeek: 1, eveningStart: "19:00", eveningEnd: "18:00" }] } });
    assert.equal(backwards.body.error.code, "bad_time");
    assert.equal((await api("PUT", `/api/clubs/${H}/timings`, { as: "clubAdmin", body: { timings: [{ dayOfWeek: 1, morningStart: "6am" }] } })).status, 400);
  });

  it("the map shows each club's practice hours on its pin (PRD §5)", async () => {
    const pins = (await api("GET", "/api/map?districtCode=TN-VELLORE")).body.clubs as { id: string; timings: PracticeTime[] }[];
    const hoopers = pins.find((p) => p.id === H)!;
    assert.deepEqual(practiceHours(hoopers.timings), ["Tue 06:00–07:30", "Sat all day"]);
    const other = pins.find((p) => p.id !== H)!;
    assert.ok(Array.isArray(other.timings));
  });
});

describe("Photo upload", () => {
  before(resetDatabase);

  it("upload a photo, get a link, open it, use it in a post", async () => {
    const res = await api("POST", "/api/uploads", { as: "player", form: form(PNG) });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.match(res.body.url, /\/api\/files\/\d{4}\/\d{2}\/[0-9a-f-]+\.png$/);
    const path = new URL(res.body.url).pathname;
    const file = await api("GET", path);
    assert.equal(file.status, 200);
    assert.equal(file.contentType, "image/png");
    assert.deepEqual(Buffer.from(file.body), PNG);

    const post = await api("POST", "/api/posts", { as: "player", body: { content: "With a real photo", images: [{ url: res.body.url }] } });
    assert.equal(post.status, 201);
    assert.equal(post.body.media[0].url, res.body.url);
    const profile = await api("PATCH", "/api/auth/me", { as: "player", body: { photoUrl: res.body.url } });
    assert.equal(profile.body.photoUrl, res.body.url);
  });

  it("refuses non-photos, empty files, visitors and limited accounts; no peeking outside the folder", async () => {
    const text = await api("POST", "/api/uploads", { as: "player", form: form(new TextEncoder().encode("hello, not a photo"), "photo.jpg") });
    assert.equal(text.body.error.code, "not_a_photo");
    assert.equal((await api("POST", "/api/uploads", { as: "player", form: form(new Uint8Array(0)) })).body.error.code, "empty_file");
    assert.equal((await api("POST", "/api/uploads", { form: form(PNG) })).status, 401);
    assert.equal((await api("POST", "/api/uploads", { as: "minorAwaitingParent", form: form(PNG) })).status, 403);
    assert.equal((await api("GET", "/api/files/..%2F..%2Fetc%2Fpasswd")).status, 404);
    assert.equal((await api("GET", "/api/files/2026/10/missing.png")).status, 404);
    // A plain http link from somewhere else is still refused in posts
    assert.equal((await api("POST", "/api/posts", { as: "player", body: { images: [{ url: "http://evil.example.com/a.png" }] } })).status, 400);
  });
});

describe("Forgot password and parent emails", () => {
  before(resetDatabase);

  const resetLink = () => {
    const mail = emailOutbox.at(-1)!;
    const token = mail.text.match(/reset-password\?token=([\w.-]+)/)?.[1];
    assert.ok(token, "reset link in email");
    return token!;
  };

  it("forgot password: an email with a link for real accounts; the same reply for unknown emails", async () => {
    const before = emailOutbox.length;
    const real = await api("POST", "/api/auth/forgot-password", { body: { email: "PLAYER@test.baskyclub.in" } });
    const fake = await api("POST", "/api/auth/forgot-password", { body: { email: "nobody@example.com" } });
    assert.deepEqual(real.body, fake.body);
    assert.equal(emailOutbox.length, before + 1);
    assert.equal(emailOutbox.at(-1)!.to, TEST_USERS.player.email);
  });

  it("the link sets a new password once; then it stops working", async () => {
    const token = resetLink();
    assert.equal((await api("POST", "/api/auth/reset-password", { body: { token, newPassword: "brandnew123" } })).status, 200);
    assert.equal((await api("POST", "/api/auth/login", { body: { login: TEST_USERS.player.email, password: TEST_PASSWORD } })).status, 401);
    assert.equal((await api("POST", "/api/auth/login", { body: { login: TEST_USERS.player.email, password: "brandnew123" } })).status, 200);
    const again = await api("POST", "/api/auth/reset-password", { body: { token, newPassword: "another123" } });
    assert.equal(again.body.error.code, "link_expired");
    const junk = await api("POST", "/api/auth/reset-password", { body: { token: "aaaaaaaaaaaaaaaaaaaaaaaa.bbbb.cccc", newPassword: "another123" } });
    assert.equal(junk.body.error.code, "link_expired");
  });

  it("a login token can't be used as a reset link", async () => {
    const login = await api("POST", "/api/auth/login", { body: { login: TEST_USERS.coach.email, password: TEST_PASSWORD } });
    const res = await api("POST", "/api/auth/reset-password", { body: { token: login.body.token, newPassword: "hijacked123" } });
    assert.equal(res.body.error.code, "link_expired");
  });

  it("suspended accounts get no reset email", async () => {
    const before = emailOutbox.length;
    await api("POST", "/api/auth/forgot-password", { body: { email: TEST_USERS.suspended.email } });
    assert.equal(emailOutbox.length, before);
  });

  it("under-18 signup emails the parent a confirmation link (#67)", async () => {
    const d = new Date();
    d.setUTCFullYear(d.getUTCFullYear() - 14);
    await api("POST", "/api/auth/signup", {
      body: { name: "Young Hooper", email: "young@example.com", phone: "9000077777", password: "goodpass123", dateOfBirth: d.toISOString().slice(0, 10), parentName: "Parent Hooper", parentEmail: "parent.hooper@example.com" },
    });
    const mail = emailOutbox.at(-1)!;
    assert.equal(mail.to, "parent.hooper@example.com");
    assert.match(mail.text, /parent-consent\?token=/);
  });
});
