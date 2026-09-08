import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CertificateTemplate, TemplateVariable } from "@/lib/template";

export type StaffAccess = {
  email: string | null;
  isAdmin: boolean;
  isIssuer: boolean;
};

export type ManagedCertificate = {
  id: string;
  certificate_number: string;
  holder_name: string;
  certification_title: string;
  issue_date: string;
  expiry_date: string | null;
  status: string;
  issuing_authority: string;
  grade: string | null;
  created_at: string;
  template_id: string | null;
  template_data: Record<string, string>;
};

const COLUMNS =
  "id, certificate_number, holder_name, certification_title, issue_date, expiry_date, status, issuing_authority, grade, created_at, template_id, template_data";

const TEMPLATE_COLUMNS =
  "id, name, description, html, variables, is_default, created_at, updated_at";


// The auth server and the data API can drift by a second or two, which makes a
// freshly minted token look like it was "issued at future". Retry briefly
// instead of throwing the user back to the sign-in screen.
const isClockSkew = (message: string) => /issued at future|jwt.*(future|not valid yet)/i.test(message);

async function withClockSkewRetry<R extends { error: { message: string } | null }>(
  run: () => Promise<R>,
): Promise<R> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const result = await run();
    if (!result.error || !isClockSkew(result.error.message)) return result;
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
  return run();
}



export const getStaffAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StaffAccess> => {
    const { data, error } = await withClockSkewRetry(async () =>
      context.supabase.from("user_roles").select("role").eq("user_id", context.userId),
    );

    if (error) throw new Error(error.message);

    const roles = (data ?? []).map((row) => row.role);
    return {
      email: (context.claims["email"] as string | undefined) ?? null,
      isAdmin: roles.includes("admin"),
      isIssuer: roles.includes("issuer"),
    };
  });

export const listCertificates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedCertificate[]> => {
    const { data, error } = await withClockSkewRetry(async () =>
      context.supabase
        .from("certificates")
        .select(COLUMNS)
        .order("created_at", { ascending: false })
        .limit(200),
    );

    if (error) throw new Error(error.message);
    return (data ?? []) as ManagedCertificate[];
  });


const createSchema = z.object({
  certificateNumber: z
    .string()
    .trim()
    .min(4)
    .max(64)
    .regex(/^[A-Za-z0-9-_/]+$/, "Only letters, numbers and dashes are allowed"),
  holderName: z.string().trim().min(2).max(120),
  certificationTitle: z.string().trim().min(2).max(160),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date"),
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  grade: z.string().trim().max(40).optional().or(z.literal("")),
  status: z.enum(["active", "expired", "revoked"]).default("active"),
  templateId: z.string().uuid().optional().or(z.literal("")),
  templateData: z.record(z.string(), z.string().max(500)).default({}),
});

export const createCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ context, data }): Promise<ManagedCertificate> => {
    const { data: row, error } = await withClockSkewRetry(async () =>
      context.supabase
        .from("certificates")
        .insert({
          certificate_number: data.certificateNumber.toUpperCase(),
          holder_name: data.holderName,
          certification_title: data.certificationTitle,
          issue_date: data.issueDate,
          expiry_date: data.expiryDate ? data.expiryDate : null,
          grade: data.grade ? data.grade : null,
          status: data.status,
          template_id: data.templateId ? data.templateId : null,
          template_data: data.templateData,
        })
        .select(COLUMNS)
        .single(),
    );



    if (error) {
      if (error.code === "23505" || error.code === "23514" || error.message.includes("duplicate")) {
        throw new Error("That certificate number already exists.");
      }
      if (error.code === "42501") {
        throw new Error("Your account is not allowed to issue certificates.");
      }
      throw new Error(error.message);
    }

    return row as ManagedCertificate;
  });

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "expired", "revoked"]),
});

export const setCertificateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => statusSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await withClockSkewRetry(async () =>
      context.supabase.from("certificates").update({ status: data.status }).eq("id", data.id),
    );


    if (error) {
      if (error.code === "42501") throw new Error("Only administrators can change a certificate.");
      throw new Error(error.message);
    }
    return { ok: true };
  });
