import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CertificateTemplate, TemplateVariable } from "@/lib/template";
import {
  DEFAULT_CERTIFICATE_PREFIX,
  generateTimeBasedCertificateNumber,
  getYearFromIssueDate,
} from "@/lib/certificate-number";

export type StaffAccess = {
  email: string | null;
  isAdmin: boolean;
  isIssuer: boolean;
};

export type ManagedIssuer = {
  id: string;
  email: string;
  fullName: string;
  role: "admin" | "issuer" | "user";
  createdAt: string;
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
  recipient_email: string | null;
  email_sent_at: string | null;
};

const COLUMNS =
  "id, certificate_number, holder_name, certification_title, issue_date, expiry_date, status, issuing_authority, grade, created_at, template_id, template_data, recipient_email, email_sent_at";

const TEMPLATE_COLUMNS =
  "id, name, description, html, variables, is_default, is_archived, created_at, updated_at";

// The auth server and the data API can drift by a second or two, which makes a
// freshly minted token look like it was "issued at future". Retry briefly
// instead of throwing the user back to the sign-in screen.
const isClockSkew = (message: string) =>
  /issued at future|jwt.*(future|not valid yet)/i.test(message);

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
const generateNumberSchema = z.object({
  year: z.number().int().min(1900).max(2100).optional(),
  prefix: z.string().trim().max(10).optional(),
});

export const generateUniqueCertificateNumber = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => generateNumberSchema.parse(data ?? {}))
  .handler(async ({ context, data }): Promise<string> => {
    const targetYear = data.year ?? new Date().getFullYear();
    const targetPrefix = (data.prefix ?? DEFAULT_CERTIFICATE_PREFIX).toUpperCase();

    const { data: rows, error } = await withClockSkewRetry(async () =>
      context.supabase
        .from("certificates")
        .select("certificate_number")
        .like("certificate_number", `${targetPrefix}-${targetYear}-%`),
    );

    if (error) {
      throw new Error(`Failed to check existing certificates: ${error.message}`);
    }

    const existingNumbers = (rows ?? []).map((r) => r.certificate_number);
    return generateTimeBasedCertificateNumber(existingNumbers, targetYear, targetPrefix);
  });

const createSchema = z.object({
  certificateNumber: z
    .string()
    .trim()
    .max(64)
    .regex(/^[A-Za-z0-9-_/]*$/, "Only letters, numbers and dashes are allowed")
    .optional()
    .or(z.literal("")),
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
  recipientEmail: z.string().trim().email("Invalid email").optional().or(z.literal("")),
});

export const createCertificate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ context, data }): Promise<ManagedCertificate> => {
    let certificateNumber = (data.certificateNumber || "").trim().toUpperCase();

    // If certificate number was not provided or is blank, autogenerate a unique time-based one
    if (!certificateNumber) {
      const year = getYearFromIssueDate(data.issueDate);
      const prefix = DEFAULT_CERTIFICATE_PREFIX;

      const { data: rows, error: searchError } = await withClockSkewRetry(async () =>
        context.supabase
          .from("certificates")
          .select("certificate_number")
          .like("certificate_number", `${prefix}-${year}-%`),
      );

      if (searchError) {
        throw new Error(`Failed to check certificate numbers: ${searchError.message}`);
      }

      const existing = (rows ?? []).map((r) => r.certificate_number);
      certificateNumber = generateTimeBasedCertificateNumber(existing, year, prefix);
    }

    const { data: row, error } = await withClockSkewRetry(async () =>
      context.supabase
        .from("certificates")
        .insert({
          certificate_number: certificateNumber,
          holder_name: data.holderName,
          certification_title: data.certificationTitle,
          issue_date: data.issueDate,
          expiry_date: data.expiryDate ? data.expiryDate : null,
          grade: data.grade ? data.grade : null,
          status: data.status,
          template_id: data.templateId ? data.templateId : null,
          template_data: data.templateData,
          recipient_email: data.recipientEmail ? data.recipientEmail : null,
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

const variableSchema = z.object({
  key: z
    .string()
    .trim()
    .min(1)
    .max(40)
    .regex(/^[a-zA-Z0-9_]+$/, "Variable names use letters, numbers and underscores"),
  label: z.string().trim().min(1).max(80),
  defaultValue: z.string().max(200).optional().or(z.literal("")),
});

const templateSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  html: z.string().min(20).max(50000),
  variables: z.array(variableSchema).max(30).default([]),
  isDefault: z.boolean().default(false),
});

export const listTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CertificateTemplate[]> => {
    const { data, error } = await withClockSkewRetry(async () =>
      context.supabase
        .from("certificate_templates")
        .select(TEMPLATE_COLUMNS)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100),
    );

    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => ({
      ...row,
      variables: (Array.isArray(row.variables) ? row.variables : []) as TemplateVariable[],
    })) as CertificateTemplate[];
  });

export const saveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => templateSchema.parse(data))
  .handler(async ({ context, data }): Promise<CertificateTemplate> => {
    const payload = {
      name: data.name,
      description: data.description ? data.description : null,
      html: data.html,
      variables: data.variables.map((v) => ({
        key: v.key,
        label: v.label,
        defaultValue: v.defaultValue ?? "",
      })),
      is_default: data.isDefault,
    };

    const { data: row, error } = await withClockSkewRetry(async () =>
      data.id
        ? context.supabase
            .from("certificate_templates")
            .update(payload)
            .eq("id", data.id)
            .select(TEMPLATE_COLUMNS)
            .single()
        : context.supabase
            .from("certificate_templates")
            .insert({ ...payload, created_by: context.userId })
            .select(TEMPLATE_COLUMNS)
            .single(),
    );

    if (error) {
      if (error.code === "42501") {
        throw new Error("Your account is not allowed to change this template.");
      }
      throw new Error(error.message);
    }

    // Only one template can be the default.
    if (data.isDefault && row) {
      await withClockSkewRetry(async () =>
        context.supabase
          .from("certificate_templates")
          .update({ is_default: false })
          .neq("id", row.id),
      );
    }

    return {
      ...row,
      variables: (Array.isArray(row.variables) ? row.variables : []) as TemplateVariable[],
    } as CertificateTemplate;
  });

export const deleteTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await withClockSkewRetry(async () =>
      context.supabase.from("certificate_templates").delete().eq("id", data.id),
    );

    if (error) {
      if (error.code === "42501") throw new Error("Only administrators can delete a template.");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const duplicateTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }): Promise<CertificateTemplate> => {
    // 1. Fetch source template
    const { data: source, error: fetchErr } = await withClockSkewRetry(async () =>
      context.supabase
        .from("certificate_templates")
        .select(TEMPLATE_COLUMNS)
        .eq("id", data.id)
        .single(),
    );

    if (fetchErr || !source) throw new Error("Template not found to duplicate.");

    // 2. Insert duplicate
    const copyName = `${source.name} (Copy)`.slice(0, 120);
    const { data: row, error: insertErr } = await withClockSkewRetry(async () =>
      context.supabase
        .from("certificate_templates")
        .insert({
          name: copyName,
          description: source.description,
          html: source.html,
          variables: source.variables ?? [],
          is_default: false,
          is_archived: false,
          created_by: context.userId,
        })
        .select(TEMPLATE_COLUMNS)
        .single(),
    );

    if (insertErr || !row) {
      if (insertErr?.code === "42501") {
        throw new Error("Your account is not allowed to create templates.");
      }
      throw new Error(insertErr?.message ?? "Failed to duplicate template.");
    }

    return {
      ...row,
      variables: (Array.isArray(row.variables) ? row.variables : []) as TemplateVariable[],
    } as CertificateTemplate;
  });

export const setDefaultTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    // Check if target template is archived
    const { data: target } = await withClockSkewRetry(async () =>
      context.supabase
        .from("certificate_templates")
        .select("is_archived")
        .eq("id", data.id)
        .single(),
    );
    if (target?.is_archived) {
      throw new Error("Archived templates cannot be set as the default.");
    }

    // Set target template as default
    const { error: setErr } = await withClockSkewRetry(async () =>
      context.supabase.from("certificate_templates").update({ is_default: true }).eq("id", data.id),
    );

    if (setErr) {
      if (setErr.code === "42501") {
        throw new Error("Your account is not allowed to update this template.");
      }
      throw new Error(setErr.message);
    }

    // Clear default on all other templates
    await withClockSkewRetry(async () =>
      context.supabase
        .from("certificate_templates")
        .update({ is_default: false })
        .neq("id", data.id),
    );

    return { ok: true };
  });

export const archiveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await withClockSkewRetry(async () =>
      context.supabase
        .from("certificate_templates")
        .update({ is_archived: true, is_default: false })
        .eq("id", data.id),
    );

    if (error) {
      if (error.code === "42501") {
        throw new Error("Your account is not allowed to archive this template.");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const unarchiveTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await withClockSkewRetry(async () =>
      context.supabase
        .from("certificate_templates")
        .update({ is_archived: false })
        .eq("id", data.id),
    );

    if (error) {
      if (error.code === "42501") {
        throw new Error("Your account is not allowed to restore this template.");
      }
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const listIssuers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ManagedIssuer[]> => {
    const { data, error } = await withClockSkewRetry(async () =>
      context.supabase.rpc("admin_list_users"),
    );

    if (error) {
      if (error.code === "42501" || error.message.includes("Access denied")) {
        throw new Error("Only administrators can view staff accounts.");
      }
      throw new Error(error.message);
    }

    return (data ?? []).map(
      (row: {
        id: string;
        email: string;
        full_name?: string | null;
        role: "admin" | "issuer" | "user";
        created_at: string;
      }) => ({
        id: row.id,
        email: row.email,
        fullName: row.full_name || "",
        role: row.role,
        createdAt: row.created_at,
      }),
    );
  });

const createIssuerSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().trim().max(100).optional().or(z.literal("")),
});

export const createIssuer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => createIssuerSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { data: userId, error } = await withClockSkewRetry(async () =>
      context.supabase.rpc("admin_create_issuer", {
        _email: data.email,
        _password: data.password,
        _full_name: data.fullName ?? "",
      }),
    );

    if (error) {
      throw new Error(error.message);
    }

    return { id: userId };
  });

const updateIssuerSchema = z.object({
  id: z.string().uuid(),
  email: z.string().trim().email("Enter a valid email address"),
  fullName: z.string().trim().max(100).optional().or(z.literal("")),
  newPassword: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .optional()
    .or(z.literal("")),
  role: z.enum(["admin", "issuer"]).optional(),
});

export const updateIssuer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => updateIssuerSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await withClockSkewRetry(async () =>
      context.supabase.rpc("admin_update_issuer", {
        _user_id: data.id,
        _email: data.email,
        _full_name: data.fullName ?? "",
        _new_password:
          data.newPassword && data.newPassword.trim().length > 0
            ? data.newPassword.trim()
            : undefined,
        _role: data.role ?? undefined,
      }),
    );

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });

const deleteIssuerSchema = z.object({
  id: z.string().uuid(),
});

export const deleteIssuer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => deleteIssuerSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { error } = await withClockSkewRetry(async () =>
      context.supabase.rpc("admin_delete_issuer", {
        _user_id: data.id,
      }),
    );

    if (error) {
      throw new Error(error.message);
    }

    return { ok: true };
  });
