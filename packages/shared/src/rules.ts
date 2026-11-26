// Input limits the server enforces (with Zod, in apps/web/src/server/services) and the apps
// check in their forms. One number per rule, so a form can't accept what the API refuses.
// Lengths are counted after trimming spaces, like the server does.

export interface LengthRule {
  min: number;
  max: number;
}

export const LIMITS = {
  password: { min: 8, max: 72 },
  personName: { min: 2, max: 80 },
  clubName: { min: 2, max: 80 },
  courtName: { min: 2, max: 120 },
  announcementTitle: { min: 3, max: 120 },
  announcementBody: { min: 3, max: 2000 },
  officeBearerName: { min: 2, max: 120 },
  officeBearerDesignation: { min: 2, max: 60 },
  legacyTitle: { min: 2, max: 200 },
  comment: { min: 1, max: 1000 },
  postContent: { min: 1, max: 5000 },
} as const satisfies Record<string, LengthRule>;

/** True when the trimmed text is within the rule (passwords: pass trim=false, spaces count). */
export function fits(text: string, rule: LengthRule, trim = true): boolean {
  const length = (trim ? text.trim() : text).length;
  return length >= rule.min && length <= rule.max;
}
