import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { renderTemplate } from "@/lib/template";

export type CertificateRecord = {
  certificate_number: string;
  holder_name: string;
  certification_title: string;
  issue_date: string;
  expiry_date: string | null;
  status: string;
  issuing_authority: string;
  grade: string | null;
  rendered_html?: string | null;
};

export type VerificationResult =
  | { outcome: "verified"; certificate: CertificateRecord }
  | { outcome: "expired" | "revoked"; certificate: CertificateRecord }
  | { outcome: "not_found"; query: string };


const inputSchema = z.object({
  certificateNumber: z
    .string()
    .trim()
    .min(4, { message: "Certificate number is too short" })
    .max(64, { message: "Certificate number is too long" })
    .regex(/^[A-Za-z0-9-_/]+$/, { message: "Only letters, numbers and dashes are allowed" }),
});

function isPastDate(value: string | null): boolean {
  if (!value) return false;
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return new Date(`${value}T00:00:00Z`).getTime() < today.getTime();
}

export const verifyCertificate = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<VerificationResult> => {
    const url = process.env["VITE_SUPABASE_URL"] ?? process.env["SUPABASE_URL"];
    const key =
      process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"];

    if (!url || !key) throw new Error("Verification service is not configured");

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const normalized = data.certificateNumber.trim().toUpperCase();

    const { data: rows, error } = await supabase
      .from("certificates")
      .select(
        "certificate_number, holder_name, certification_title, issue_date, expiry_date, status, issuing_authority, grade",
      )
      .eq("certificate_number", normalized)
      .limit(1);

    if (error) throw new Error(error.message);

    const certificate = rows?.[0] as CertificateRecord | undefined;
    if (!certificate) return { outcome: "not_found", query: normalized };

    if (certificate.status === "revoked") return { outcome: "revoked", certificate };
    if (certificate.status === "expired" || isPastDate(certificate.expiry_date)) {
      return { outcome: "expired", certificate };
    }

    return { outcome: "verified", certificate };
  });
