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
 * Values are HTML-escaped so template data can never inject markup.
 */
export function renderTemplate(html: string, values: Record<string, string | null | undefined>) {
  const escape = (raw: string) =>
    raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const withSections = html.replace(
    /\{\{#\s*([a-zA-Z0-9_]+)\s*\}\}([\s\S]*?)\{\{\/\s*\1\s*\}\}/g,
    (_full, name: string, inner: string) => (values[name] ? inner : ""),
  );

  return withSections.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_full, name: string) => {
    const value = values[name];
    return value ? escape(String(value)) : "";
  });
}
