// Age rules (under-18 accounts need a parent, #67). Counted on the UTC calendar day on both
// the server and the apps, so they never disagree around midnight or in another time zone.

export const ADULT_AGE = 18;

/**
 * Age in whole years on a given day (default: today).
 * dateOfBirth: a Date, or a "YYYY-MM-DD" / ISO string as the API sends it.
 */
export function ageOn(dateOfBirth: Date | string, on: Date = new Date()): number {
  const dob = typeof dateOfBirth === "string" ? new Date(dateOfBirth) : dateOfBirth;
  if (Number.isNaN(dob.getTime())) return NaN;
  let age = on.getUTCFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    on.getUTCMonth() < dob.getUTCMonth() ||
    (on.getUTCMonth() === dob.getUTCMonth() && on.getUTCDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export const isMinorOn = (dateOfBirth: Date | string, on: Date = new Date()) => ageOn(dateOfBirth, on) < ADULT_AGE;
