export const DEFAULT_CERTIFICATE_PREFIX = "WE";

/**
 * Standard format: WE-YYYY-[ALPHANUMERIC]
 * e.g., WE-2026-Y38AE4TC, WE-2026-38AEQ6
 */
export const STANDARD_CERTIFICATE_REGEX = /^([A-Z0-9]{2,10})-(\d{4})-([A-Z0-9]{4,16})$/;

/**
 * Crockford-inspired safe uppercase alphanumeric characters
 * (omits confusing characters like I, O to prevent transcription errors)
 */
export const SAFE_ALPHANUMERIC_CHARS = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export interface ParsedCertificateNumber {
  prefix: string;
  year: number;
  suffix: string;
}

/**
 * Parses a certificate number if it follows the canonical format [PREFIX]-[YEAR]-[ALPHANUMERIC]
 */
export function parseCertificateNumber(value: string): ParsedCertificateNumber | null {
  if (!value) return null;
  const match = value.trim().toUpperCase().match(STANDARD_CERTIFICATE_REGEX);
  if (!match || !match[1] || !match[2] || !match[3]) return null;

  return {
    prefix: match[1],
    year: parseInt(match[2], 10),
    suffix: match[3],
  };
}

/**
 * Validates whether a certificate number adheres to the standard format WE-YYYY-[ALPHANUMERIC]
 */
export function isValidCertificateFormat(value: string): boolean {
  return STANDARD_CERTIFICATE_REGEX.test(value.trim().toUpperCase());
}

/**
 * Derives issuance year from an ISO date string (YYYY-MM-DD) or returns current year
 */
export function getYearFromIssueDate(issueDate?: string | null): number {
  if (issueDate && /^\d{4}/.test(issueDate)) {
    const year = parseInt(issueDate.slice(0, 4), 10);
    if (!isNaN(year) && year >= 1900 && year <= 2100) {
      return year;
    }
  }
  return new Date().getFullYear();
}

/**
 * Generates a unique, time-based alphanumeric certificate number.
 * Format: WE-YYYY-XXXXXXXX (e.g. WE-2026-Y38AE4TC)
 *
 * Components:
 * 1. Prefix: e.g. WE
 * 2. Year: e.g. 2026 (or extracted from issue date)
 * 3. Time component: Millisecond timestamp encoded in Base36 (chronologically orderable)
 * 4. Entropy component: Random safe alphanumeric characters ensuring uniqueness even within the exact same millisecond
 * 5. Database collision avoidance against existing entries
 */
export function generateTimeBasedCertificateNumber(
  existingNumbers?: Iterable<string>,
  year: number = new Date().getFullYear(),
  prefix: string = DEFAULT_CERTIFICATE_PREFIX,
  length: 6 | 8 = 8,
): string {
  const normalizedPrefix = prefix.trim().toUpperCase() || DEFAULT_CERTIFICATE_PREFIX;
  const existingSet = new Set(
    existingNumbers
      ? Array.from(existingNumbers).map((n) => n.trim().toUpperCase())
      : [],
  );

  const now = Date.now();
  const base36Time = now.toString(36).toUpperCase();

  for (let attempt = 0; attempt < 50; attempt++) {
    let suffix = "";
    if (length === 6) {
      // 4 chars from timestamp + 2 random characters
      const timePart = base36Time.slice(-4);
      let rand = "";
      for (let i = 0; i < 2; i++) {
        rand += SAFE_ALPHANUMERIC_CHARS[Math.floor(Math.random() * SAFE_ALPHANUMERIC_CHARS.length)];
      }
      suffix = `${timePart}${rand}`;
    } else {
      // 5 chars from timestamp + 3 random characters = 8 chars
      const timePart = base36Time.slice(-5);
      let rand = "";
      for (let i = 0; i < 3; i++) {
        rand += SAFE_ALPHANUMERIC_CHARS[Math.floor(Math.random() * SAFE_ALPHANUMERIC_CHARS.length)];
      }
      suffix = `${timePart}${rand}`;
    }

    const candidate = `${normalizedPrefix}-${year}-${suffix}`;
    if (!existingSet.has(candidate)) {
      return candidate;
    }
  }

  // Extreme fallback with random salt
  return `${normalizedPrefix}-${year}-${Date.now().toString(36).toUpperCase()}${Math.floor(10 + Math.random() * 90)}`;
}
