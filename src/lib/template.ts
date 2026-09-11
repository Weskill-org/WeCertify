import { buildVerificationUrl, generateQrCodeSvg, getCertificateQrCodeDataUrl } from "./qr";

export type TemplateVariable = {
  key: string;
  label: string;
  defaultValue?: string;
};

export type CertificateTemplate = {
  id: string;
  name: string;
  description: string | null;
  html: string;
  variables: TemplateVariable[];
  is_default: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

export const BUILT_IN_VARIABLES = [
  "certificate_number",
  "holder_name",
  "certification_title",
  "issue_date",
  "expiry_date",
  "issuing_authority",
  "grade",
  "status",
  "verification_url",
  "qr_code_url",
  "qr_code_svg",
] as const;

/** Extracts {{variable}} names used by a template, ignoring built-in fields. */
export function extractCustomVariables(html: string): string[] {
  const found = new Set<string>();
  const pattern = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const name = match[1]!;
    if (!(BUILT_IN_VARIABLES as readonly string[]).includes(name)) found.add(name);
  }
  return [...found];
}

/**
 * Fills {{variables}} and strips {{#name}}...{{/name}} blocks whose value is empty.
 * Built-in variables like verification_url, qr_code_url, and qr_code_svg are automatically
 * populated using the canonical domain certify.weskill.org if certificate_number is present.
 */
export function renderTemplate(html: string, values: Record<string, string | null | undefined>) {
  const escape = (raw: string) =>
    raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  // Auto-populate verification URL and QR code if certificate_number is provided
  const certNumber = values["certificate_number"];
  const finalValues: Record<string, string | null | undefined> = { ...values };

  if (certNumber) {
    if (!finalValues["verification_url"]) {
      finalValues["verification_url"] = buildVerificationUrl(certNumber);
    }
    if (!finalValues["qr_code_url"]) {
      finalValues["qr_code_url"] = getCertificateQrCodeDataUrl(certNumber, 120);
    }
    if (!finalValues["qr_code_svg"]) {
      finalValues["qr_code_svg"] = generateQrCodeSvg(finalValues["verification_url"]!, 120);
    }
  }

  const withSections = html.replace(
    /\{\{#\s*([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/\s*\1\s*\}\}/g,
    (_full, name: string, inner: string) => (finalValues[name] ? inner : ""),
  );

  return withSections.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_full, name: string) => {
    const value = finalValues[name];
    if (name === "qr_code_svg" && value) {
      // Return raw SVG unescaped so browser interprets vector graphics
      return String(value);
    }
    return value ? escape(String(value)) : "";
  });
}
