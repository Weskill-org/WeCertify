const ID_PATTERN = /\b[A-Z]{2,5}-\d{4}-\d{4,8}\b/i;

/**
 * QR payloads may be a bare certificate number, a verification URL
 * (?id= / ?cert= / ?certificate=), or a JSON blob. Pull the ID out of any of them.
 */
export function extractCertificateId(payload: string): string | null {
  const raw = payload.trim();
  if (!raw) return null;

  // Try URL query params first.
  try {
    const url = new URL(raw);
    for (const key of ["id", "cert", "certificate", "certificate_number", "number", "c"]) {
      const value = url.searchParams.get(key);
      if (value) return value.trim().toUpperCase();
    }
    const lastSegment = url.pathname.split("/").filter(Boolean).pop();
    if (lastSegment && ID_PATTERN.test(lastSegment)) return lastSegment.toUpperCase();
  } catch {
    // not a URL — keep going
  }

  // Try JSON payloads.
  if (raw.startsWith("{")) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      for (const key of ["id", "certificateNumber", "certificate_number", "cert", "number"]) {
        const value = parsed[key];
        if (typeof value === "string" && value.trim()) return value.trim().toUpperCase();
      }
    } catch {
      // fall through
    }
  }

  const match = raw.match(ID_PATTERN);
  if (match) return match[0].toUpperCase();

  if (/^[A-Za-z0-9-_/]{4,64}$/.test(raw)) return raw.toUpperCase();
  return null;
}
