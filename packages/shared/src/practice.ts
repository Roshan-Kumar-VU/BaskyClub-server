// Club practice hours (club_court_timings): one row per weekday, 1 = Monday … 7 = Sunday.
// Shown on club pages and map pins (PRD §5) by the app and the website.

export interface PracticeTime {
  dayOfWeek: number;
  isFullDay: boolean;
  morningStart: string | null;
  morningEnd: string | null;
  eveningStart: string | null;
  eveningEnd: string | null;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const slot = (start: string | null, end: string | null) => (start && end ? `${start}–${end}` : start ? `from ${start}` : end ? `until ${end}` : null);

/** One line per practice day, Monday first: "Tue 06:00–07:30, 18:00–19:30", "Sat all day". Days with no time are left out. */
export function practiceHours(timings: readonly PracticeTime[]): string[] {
  return [...timings]
    .filter((t) => t.dayOfWeek >= 1 && t.dayOfWeek <= 7)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .flatMap((t) => {
      const day = DAYS[t.dayOfWeek - 1];
      if (t.isFullDay) return [`${day} all day`];
      const slots = [slot(t.morningStart, t.morningEnd), slot(t.eveningStart, t.eveningEnd)].filter(Boolean);
      return slots.length ? [`${day} ${slots.join(", ")}`] : [];
    });
}
