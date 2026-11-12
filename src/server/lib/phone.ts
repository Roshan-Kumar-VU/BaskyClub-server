/**
 * Indian mobile numbers are stored one way only: +91XXXXXXXXXX.
 * Accepts "98765 43210", "098765-43210", "+91 9876543210", "919876543210".
 * Returns null when it is not a valid Indian mobile number (must start with 6–9).
 */
export function normalizeIndianPhone(input: string): string | null {
  let digits = input.replace(/[^\d]/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) return null;
  return `+91${digits}`;
}
