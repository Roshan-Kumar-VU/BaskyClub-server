import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ageOn, fits, isMinorOn, LIMITS, normalizeYouTubeUrl, practiceHours, type PracticeTime, youtubeId, youtubeThumbnail } from "../src";

const ID = "dQw4w9WgXcQ";

describe("YouTube links", () => {
  it("accepts every usual link shape and returns the clean watch link", () => {
    for (const link of [
      `https://www.youtube.com/watch?v=${ID}`,
      `https://youtube.com/watch?v=${ID}&t=42s`,
      `https://m.youtube.com/watch?v=${ID}`,
      `http://www.youtube.com/watch?v=${ID}`,
      `https://youtu.be/${ID}`,
      `https://youtu.be/${ID}?si=abc`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://www.youtube.com/live/${ID}`,
      `https://www.youtube.com/embed/${ID}`,
      `  https://youtu.be/${ID}  `,
      `https://WWW.YOUTUBE.COM/watch?v=${ID}`,
    ]) {
      assert.equal(normalizeYouTubeUrl(link), `https://www.youtube.com/watch?v=${ID}`, link);
      assert.equal(youtubeId(link), ID, link);
    }
  });

  it("refuses anything that isn't a YouTube video link", () => {
    for (const link of [
      "",
      "not a link",
      `youtube.com/watch?v=${ID}`, // no scheme
      `ftp://youtube.com/watch?v=${ID}`,
      `javascript:alert(1)//youtube.com/watch?v=${ID}`,
      "https://www.youtube.com/watch?v=short", // wrong length
      `https://www.youtube.com/watch?v=${ID}x`,
      "https://www.youtube.com/watch?v=abc$%^&*(def", // bad characters
      "https://www.youtube.com/",
      "https://www.youtube.com/channel/UCabcdefghijk",
      `https://evil.example.com/watch?v=${ID}`,
      `https://youtube.com.evil.example/watch?v=${ID}`,
      `https://notyoutube.com/watch?v=${ID}`,
      `https://youtu.be/`,
    ]) {
      assert.equal(normalizeYouTubeUrl(link), null, link);
      assert.equal(youtubeId(link), null, link);
    }
  });

  it("thumbnail only for real video links", () => {
    assert.equal(youtubeThumbnail(`https://youtu.be/${ID}`), `https://i.ytimg.com/vi/${ID}/hqdefault.jpg`);
    assert.equal(youtubeThumbnail("https://example.com/a.png"), null);
  });
});

describe("Age", () => {
  const day = (s: string) => new Date(`${s}T00:00:00Z`);

  it("turns 18 exactly on the birthday (UTC day), not a day early or late", () => {
    assert.equal(ageOn(day("2008-11-23"), day("2026-11-22")), 17);
    assert.equal(ageOn(day("2008-11-23"), day("2026-11-23")), 18);
    assert.equal(ageOn(day("2008-11-23"), new Date("2026-11-23T23:59:59Z")), 18);
    assert.equal(isMinorOn(day("2008-11-23"), day("2026-11-22")), true);
    assert.equal(isMinorOn(day("2008-11-23"), day("2026-11-23")), false);
  });

  it("same answer for a Date and the API's string forms", () => {
    const on = day("2026-06-01");
    assert.equal(ageOn("2008-06-02", on), 17);
    assert.equal(ageOn("2008-06-01", on), 18);
    assert.equal(ageOn("2008-06-01T00:00:00.000Z", on), 18);
    assert.equal(ageOn(day("2008-06-01"), on), 18);
  });

  it("early morning in India is still the previous UTC day (server and app agree)", () => {
    // 03:00 IST on 23 Nov = 21:30 UTC on 22 Nov → not 18 yet, on both sides
    assert.equal(ageOn("2008-11-23", new Date("2026-11-23T03:00:00+05:30")), 17);
  });

  it("29 February birthdays count from 1 March in other years", () => {
    assert.equal(ageOn("2008-02-29", day("2026-02-28")), 17);
    assert.equal(ageOn("2008-02-29", day("2026-03-01")), 18);
    assert.equal(ageOn("2008-02-29", day("2028-02-29")), 20);
  });

  it("invalid dates give NaN, which is never treated as a minor or adult by mistake", () => {
    assert.ok(Number.isNaN(ageOn("not a date")));
    assert.ok(Number.isNaN(ageOn("")));
    assert.equal(isMinorOn("not a date"), false); // NaN < 18 is false: callers must validate the date first
  });
});

describe("Length rules", () => {
  it("min and max are inclusive, counted after trimming", () => {
    const r = LIMITS.clubName; // 2..80
    assert.equal(fits("A", r), false);
    assert.equal(fits("AB", r), true);
    assert.equal(fits("  A  ", r), false);
    assert.equal(fits("   ", r), false);
    assert.equal(fits("x".repeat(80), r), true);
    assert.equal(fits("x".repeat(81), r), false);
    assert.equal(fits(`  ${"x".repeat(80)}  `, r), true);
  });

  it("passwords keep their spaces", () => {
    assert.equal(fits("       a", LIMITS.password, false), true); // 8 characters
    assert.equal(fits("       a", LIMITS.password), false);
    assert.equal(fits("x".repeat(72), LIMITS.password, false), true);
    assert.equal(fits("x".repeat(73), LIMITS.password, false), false);
  });
});

describe("Practice hours", () => {
  const t = (dayOfWeek: number, p: Partial<PracticeTime> = {}): PracticeTime => ({ dayOfWeek, isFullDay: false, morningStart: null, morningEnd: null, eveningStart: null, eveningEnd: null, ...p });

  it("one line per day, Monday first, morning then evening", () => {
    assert.deepEqual(
      practiceHours([t(6, { isFullDay: true }), t(2, { morningStart: "06:00", morningEnd: "07:30", eveningStart: "18:00", eveningEnd: "19:30" }), t(7, { eveningStart: "17:00", eveningEnd: "19:00" })]),
      ["Tue 06:00–07:30, 18:00–19:30", "Sat all day", "Sun 17:00–19:00"],
    );
  });

  it("half-filled slots, empty days and bad day numbers", () => {
    assert.deepEqual(practiceHours([t(1, { morningStart: "06:00" }), t(3, { eveningEnd: "20:00" }), t(4), t(0, { isFullDay: true }), t(8, { isFullDay: true })]), ["Mon from 06:00", "Wed until 20:00"]);
    assert.deepEqual(practiceHours([]), []);
  });
});
