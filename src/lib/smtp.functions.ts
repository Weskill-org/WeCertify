import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import nodemailer, { type SendMailOptions } from "nodemailer";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildVerificationUrl, CANONICAL_VERIFY_BASE_URL } from "@/lib/qr";
import { generateCertificatePdf } from "@/lib/certificate-pdf";
import { renderTemplate } from "@/lib/template";

export type SmtpPublicConfig = {
  isConfigured: boolean;
  provider: string;
  fromEmail: string;
  fromName: string;
  defaultSubject: string;
  defaultBody: string;
  host?: string;
  port?: number;
  secure?: boolean;
  userName?: string;
  hasPassword?: boolean;
  hasResendApiKey?: boolean;
  updatedAt?: string;
};

export type EmailPublicConfig = SmtpPublicConfig;

export type CertificateEmailPayload = {
  certificateId: string;
  recipientEmail: string;
  subject: string;
  body: string;
};

function getAppOrigin(): string {
  try {
    const req = getRequest();
    if (req?.url) {
      const url = new URL(req.url);
      if (
        !url.origin.includes("localhost") &&
        !url.origin.includes("127.0.0.1") &&
        !url.origin.includes("lovable")
      ) {
        return url.origin;
      }
    }
    const host = req?.headers?.get("host");
    const proto = req?.headers?.get("x-forwarded-proto") ?? "https";
    if (
      host &&
      !host.includes("localhost") &&
      !host.includes("127.0.0.1") &&
      !host.includes("lovable")
    ) {
      return `${proto}://${host}`;
    }
  } catch {
    // fallback
  }
  return CANONICAL_VERIFY_BASE_URL;
}

export function replacePlaceholders(
  text: string,
  data: Record<string, string | null | undefined>,
): string {
  let result = text;
  for (const [key, val] of Object.entries(data)) {
    const safeVal = val ?? "";
    result = result.replaceAll(new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g"), safeVal);
  }

  // Handle simple mustache-style conditional block: {{#grade}}...{{/grade}}
  result = result.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, varName: string, innerContent: string) => {
      const val = data[varName];
      if (val && String(val).trim().length > 0) {
        return replacePlaceholders(innerContent, data);
      }
      return "";
    },
  );

  return result;
}

export function buildCertificateEmailHtml(params: {
  subject: string;
  bodyHtml: string;
  holderName: string;
  certificationTitle: string;
  certificateNumber: string;
  issueDate: string;
  grade?: string | null;
  issuingAuthority: string;
  verificationUrl: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${params.subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f1f5f9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width: 600px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); border: 1px solid #e2e8f0;">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0b1b33 0%, #162a4d 100%); padding: 36px 32px; text-align: center;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #f7f5ef; letter-spacing: -0.02em;">WeCertify</h1>
              <p style="margin: 6px 0 0; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.18em; color: #c9a227;">Official Weskill Credential Registry</p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 32px;">
              <div style="font-size: 15px;">
                ${params.bodyHtml}
              </div>

              <!-- Certificate Detail Card -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin: 28px 0 20px; padding: 20px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #0284c7; margin-bottom: 12px;">Verified Credential Details</div>
                    <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 14px;">
                      <tr>
                        <td width="35%" style="color: #64748b; font-weight: 500;">Recipient:</td>
                        <td style="color: #0f172a; font-weight: 600;">${params.holderName}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Programme:</td>
                        <td style="color: #0f172a; font-weight: 600;">${params.certificationTitle}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Certificate ID:</td>
                        <td style="color: #0f172a; font-family: monospace; font-weight: 700;">${params.certificateNumber}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Issue Date:</td>
                        <td style="color: #0f172a;">${params.issueDate}</td>
                      </tr>
                      ${
                        params.grade
                          ? `
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Grade:</td>
                        <td style="color: #0f172a;">${params.grade}</td>
                      </tr>`
                          : ""
                      }
                    </table>
                  </td>
                </tr>
              </table>

              <!-- PDF Attachment Notice Card -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; margin: 0 0 28px; padding: 14px 18px;">
                <tr>
                  <td width="34" style="vertical-align: middle; font-size: 20px; line-height: 1;">📎</td>
                  <td style="vertical-align: middle;">
                    <div style="font-size: 13px; font-weight: 700; color: #166534;">Official Certificate PDF Attached</div>
                    <div style="font-size: 12px; color: #15803d; margin-top: 2px;">
                      An authentic high-resolution PDF document (<strong>${params.certificateNumber}.pdf</strong>) has been attached with this email for your official records and verification.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <div style="text-align: center; margin: 36px 0 20px;">
                <a href="${params.verificationUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b89728 100%); color: #0b1b33; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.35);">
                  View &amp; Verify Certificate
                </a>
                <p style="margin: 12px 0 0; font-size: 12px; color: #94a3b8;">
                  Or copy this direct link: <a href="${params.verificationUrl}" style="color: #0284c7; text-decoration: underline;">${params.verificationUrl}</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                This authentic digital credential was issued by <strong>${params.issuingAuthority}</strong> through the WeCertify registry powered by Supabase.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export const getSmtpSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SmtpPublicConfig> => {
    // Fetch roles
    const { data: roleData } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (roleData ?? []).map((r) => r.role);
    const isAdmin = roles.includes("admin");
    const isIssuer = roles.includes("issuer");

    if (!isAdmin && !isIssuer) {
      throw new Error("You do not have permission to access Email settings.");
    }

    const { data: row, error } = await context.supabase
      .from("smtp_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load email settings: ${error.message}`);
    }

    if (!row) {
      return {
        isConfigured: false,
        provider: "smtp",
        fromEmail: "certificates@weskill.org",
        fromName: "WeCertify by Weskill",
        defaultSubject:
          "Your Certificate for {{certification_title}} is Ready - {{certificate_number}}",
        defaultBody:
          "Dear {{holder_name}},\n\nCongratulations! We are pleased to inform you that your certificate for {{certification_title}} has been successfully issued.\n\nCertificate Details:\n- Certificate ID: {{certificate_number}}\n- Issue Date: {{issue_date}}\n{{#grade}}- Grade: {{grade}}\n{{/grade}}- Issuing Authority: {{issuing_authority}}\n\nYou can view and verify the authenticity of your official credential online anytime using the following link:\n{{verification_url}}\n\nBest regards,\n{{issuing_authority}}",
        host: "",
        port: 587,
        secure: false,
        userName: "",
        hasPassword: false,
      };
    }

    const hasSmtp = Boolean(
      row.host &&
      row.host.trim().length > 0 &&
      row.user_name &&
      row.user_name.trim().length > 0 &&
      row.from_email,
    );

    return {
      isConfigured: hasSmtp,
      provider: "smtp",
      fromEmail: row.from_email || "certificates@weskill.org",
      fromName: row.from_name || "WeCertify by Weskill",
      defaultSubject:
        row.default_subject ||
        "Your Certificate for {{certification_title}} is Ready - {{certificate_number}}",
      defaultBody: row.default_body || "",
      host: row.host || "",
      port: row.port || 587,
      secure: Boolean(row.secure),
      userName: row.user_name || "",
      hasPassword: Boolean(row.password && row.password.trim().length > 0),
      updatedAt: row.updated_at,
    };
  });

export const getEmailSettings = getSmtpSettings;

const saveEmailSchema = z.object({
  provider: z.string().optional().default("smtp"),
  fromEmail: z.string().trim().email("Enter a valid from email").max(150),
  fromName: z.string().trim().min(1, "Sender name is required").max(150),
  defaultSubject: z.string().trim().min(1, "Default subject is required").max(250),
  defaultBody: z.string().min(10, "Default email body is too short").max(10000),
  host: z.string().trim().min(1, "SMTP host is required").max(250),
  port: z.coerce.number().optional().default(587),
  secure: z.boolean().optional().default(false),
  userName: z.string().trim().min(1, "SMTP username is required").max(250),
  password: z.string().optional().or(z.literal("")),
});

export const saveSmtpSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveEmailSchema.parse(data))
  .handler(async ({ context, data }) => {
    // Check admin
    const { data: roleData } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (roleData ?? []).map((r) => r.role);
    if (!roles.includes("admin")) {
      throw new Error("Only administrators can configure Email settings.");
    }

    const { data: existing } = await context.supabase
      .from("smtp_settings")
      .select("id, password")
      .limit(1)
      .maybeSingle();

    const passwordToSave =
      data.password !== undefined && data.password.trim().length > 0
        ? data.password
        : (existing?.password ?? "");

    const payload = {
      provider: "smtp",
      from_email: data.fromEmail,
      from_name: data.fromName,
      default_subject: data.defaultSubject,
      default_body: data.defaultBody,
      host: data.host,
      port: data.port ?? 587,
      secure: Boolean(data.secure),
      user_name: data.userName,
      password: passwordToSave,
      updated_at: new Date().toISOString(),
    };

    let saveError;
    if (existing?.id) {
      const { error } = await context.supabase
        .from("smtp_settings")
        .update(payload)
        .eq("id", existing.id);
      saveError = error;
    } else {
      const { error } = await context.supabase.from("smtp_settings").insert(payload);
      saveError = error;
    }

    if (saveError) {
      throw new Error(`Failed to save email settings: ${saveError.message}`);
    }

    return { ok: true };
  });

export const saveEmailSettings = saveSmtpSettings;

async function dispatchEmail(params: {
  to: string;
  subject: string;
  text: string;
  html: string;
  fromEmail: string;
  fromName: string;
  settings: {
    provider?: string | null;
    host?: string | null;
    port?: number | null;
    secure?: boolean | null;
    user_name?: string | null;
    password?: string | null;
  } | null;
  attachments?: SendMailOptions["attachments"];
}): Promise<{ messageId: string; provider: string }> {
  const host = params.settings?.host?.trim();
  const port = params.settings?.port || 587;
  const secure = Boolean(params.settings?.secure);
  const userName = params.settings?.user_name?.trim();
  const password = params.settings?.password || "";

  if (!host || !userName) {
    throw new Error(
      "Custom SMTP is not configured yet. Please open Email Settings to configure your SMTP host, port, username, and password.",
    );
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: userName ? { user: userName, pass: password } : undefined,
    connectionTimeout: 15000,
  });

  const info = await transporter.sendMail({
    from: `"${params.fromName}" <${params.fromEmail}>`,
    to: params.to.trim(),
    subject: params.subject,
    text: params.text,
    html: params.html,
    attachments: params.attachments,
  });

  return {
    messageId: info.messageId || `smtp_${Date.now()}`,
    provider: "smtp",
  };
}

const testEmailSchema = z.object({
  testRecipientEmail: z
    .string()
    .trim()
    .email("Enter a valid test email")
    .optional()
    .or(z.literal("")),
});

export const testSmtpConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => testEmailSchema.parse(data))
  .handler(async ({ context, data }) => {
    const { data: roleData } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (roleData ?? []).map((r) => r.role);
    if (!roles.includes("admin")) {
      throw new Error("Only administrators can test email dispatch.");
    }

    const { data: settings } = await context.supabase
      .from("smtp_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const hasSmtp = Boolean(settings?.host?.trim() && settings?.user_name?.trim());
    if (!hasSmtp) {
      throw new Error(
        "Custom SMTP server is not configured yet. Please enter your SMTP credentials in Email Settings first.",
      );
    }

    if (!data.testRecipientEmail || data.testRecipientEmail.trim().length === 0) {
      return {
        ok: true,
        message:
          "Custom SMTP server is configured. Enter an email address to send a live test message.",
      };
    }

    const testSubject = "[WeCertify] Test Email — Delivery Verification";
    const testBody = `Hello!\n\nThis is a live test notification from WeCertify confirming that Custom SMTP email delivery is active and working properly.\n\nTimestamp: ${new Date().toISOString()}`;
    const testHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 24px; color: #0f172a;">
        <h2 style="color: #c9a227; margin: 0 0 12px;">WeCertify Test Notification</h2>
        <p style="font-size: 15px; line-height: 1.6;">${testBody.replace(/\n/g, "<br/>")}</p>
        <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Sent from WeCertify Credential Registry via Custom SMTP</p>
      </div>
    `;

    const dispatchResult = await dispatchEmail({
      to: data.testRecipientEmail.trim(),
      subject: testSubject,
      text: testBody,
      html: testHtml,
      fromEmail: settings?.from_email || "certificates@weskill.org",
      fromName: settings?.from_name || "WeCertify by Weskill",
      settings,
    });

    return {
      ok: true,
      message: `Test email successfully sent to ${data.testRecipientEmail} via Custom SMTP!`,
    };
  });

export const testEmailDelivery = testSmtpConnection;

const sendEmailSchema = z.object({
  certificateId: z.string().uuid("Invalid certificate ID"),
  recipientEmail: z.string().trim().email("Valid recipient email is required"),
  subject: z.string().trim().min(1, "Subject is required").max(300),
  body: z.string().min(5, "Body is required").max(15000),
  pdfBase64: z.string().optional(),
});

export const sendCertificateEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => sendEmailSchema.parse(data))
  .handler(async ({ context, data }) => {
    // Verify admin or issuer
    const { data: roleData } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (roleData ?? []).map((r) => r.role);
    if (!roles.includes("admin") && !roles.includes("issuer")) {
      throw new Error("You do not have permission to send certificate emails.");
    }

    // Fetch Certificate details along with its assigned template
    const { data: cert, error: certErr } = await context.supabase
      .from("certificates")
      .select(
        "id, certificate_number, holder_name, certification_title, issue_date, expiry_date, grade, issuing_authority, status, template_id, template_data, certificate_templates(id, name, html)",
      )
      .eq("id", data.certificateId)
      .maybeSingle();

    if (certErr || !cert) {
      throw new Error("Certificate not found.");
    }

    const rawTemplate = cert.certificate_templates;
    const templateObj = Array.isArray(rawTemplate) ? rawTemplate[0] : rawTemplate;
    let templateName = templateObj?.name ?? null;

    if (!templateName) {
      const { data: defaultTpl } = await context.supabase
        .from("certificate_templates")
        .select("id, name")
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();
      templateName = defaultTpl?.name ?? null;
    }

    // Fetch Email settings
    const { data: settings } = await context.supabase
      .from("smtp_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    const origin = getAppOrigin();
    const verificationUrl = buildVerificationUrl(cert.certificate_number, origin);

    const templateData: Record<string, string | null | undefined> = {
      holder_name: cert.holder_name,
      certification_title: cert.certification_title,
      certificate_number: cert.certificate_number,
      issue_date: cert.issue_date,
      expiry_date: cert.expiry_date ?? "Permanent",
      grade: cert.grade ?? "",
      issuing_authority: cert.issuing_authority,
      verification_url: verificationUrl,
      recipient_email: data.recipientEmail,
    };

    const finalSubject = replacePlaceholders(data.subject, templateData);
    const finalBodyText = replacePlaceholders(data.body, templateData);

    // Convert newlines in final body to HTML paragraphs / breaks
    const escapedBody = finalBodyText
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .split("\n\n")
      .map(
        (p) =>
          `<p style="margin: 0 0 16px; line-height: 1.6; color: #334155;">${p.replace(/\n/g, "<br/>")}</p>`,
      )
      .join("");

    const htmlEmail = buildCertificateEmailHtml({
      subject: finalSubject,
      bodyHtml: escapedBody,
      holderName: cert.holder_name,
      certificationTitle: cert.certification_title,
      certificateNumber: cert.certificate_number,
      issueDate: cert.issue_date,
      grade: cert.grade,
      issuingAuthority: cert.issuing_authority,
      verificationUrl,
    });

    // Generate or prepare Certificate PDF attachment
    let pdfBuffer: Buffer;
    if (data.pdfBase64 && data.pdfBase64.trim().length > 0) {
      pdfBuffer = Buffer.from(data.pdfBase64.trim(), "base64");
    } else {
      pdfBuffer = await generateCertificatePdf({
        certificateNumber: cert.certificate_number,
        holderName: cert.holder_name,
        certificationTitle: cert.certification_title,
        issueDate: cert.issue_date,
        expiryDate: cert.expiry_date,
        grade: cert.grade,
        issuingAuthority: cert.issuing_authority,
        status: cert.status,
        templateName,
        templateData: cert.template_data as Record<string, string | null | undefined> | null,
        baseOrigin: origin,
      });
    }

    const pdfFileName = `${cert.certificate_number}.pdf`;

    let dispatchResult: { messageId: string; provider: string };
    try {
      dispatchResult = await dispatchEmail({
        to: data.recipientEmail.trim(),
        subject: finalSubject,
        text: finalBodyText,
        html: htmlEmail,
        fromEmail: settings?.from_email || "certificates@weskill.org",
        fromName: settings?.from_name || "WeCertify by Weskill",
        settings,
        attachments: [
          {
            filename: pdfFileName,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      });
    } catch (dispatchErr) {
      const errMsg = dispatchErr instanceof Error ? dispatchErr.message : "Email delivery failed";
      console.error("[Email Dispatch Error]", errMsg);

      // Record failure in audit log
      await context.supabase.from("certificate_email_logs").insert({
        certificate_id: data.certificateId,
        recipient_email: data.recipientEmail.trim(),
        subject: finalSubject,
        status: "failed",
        provider: "smtp",
        error_message: errMsg,
        metadata: {
          attemptedAt: new Date().toISOString(),
          sentBy: context.userId,
        },
      });

      throw new Error(errMsg);
    }

    const nowIso = new Date().toISOString();

    // 1. Update certificates table
    await context.supabase
      .from("certificates")
      .update({
        recipient_email: data.recipientEmail.trim(),
        email_sent_at: nowIso,
      })
      .eq("id", data.certificateId);

    // 2. Insert audit log
    await context.supabase.from("certificate_email_logs").insert({
      certificate_id: data.certificateId,
      recipient_email: data.recipientEmail.trim(),
      subject: finalSubject,
      status: "sent",
      provider: dispatchResult.provider,
      metadata: {
        messageId: dispatchResult.messageId,
        sentBy: context.userId,
        sentAt: nowIso,
        attachedPdf: pdfFileName,
        pdfSizeBytes: pdfBuffer.length,
      },
    });

    return {
      ok: true,
      messageId: dispatchResult.messageId,
      sentAt: nowIso,
      recipient: data.recipientEmail.trim(),
      provider: dispatchResult.provider,
      attachedPdf: pdfFileName,
    };
  });

export const getCertificatePdf = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ certificateId: z.string().uuid("Invalid certificate ID") }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: cert, error: certErr } = await context.supabase
      .from("certificates")
      .select(
        "id, certificate_number, holder_name, certification_title, issue_date, expiry_date, grade, issuing_authority, status, template_id, template_data, certificate_templates(id, name, html)",
      )
      .eq("id", data.certificateId)
      .maybeSingle();

    if (certErr || !cert) {
      throw new Error("Certificate not found.");
    }

    const rawTemplate = cert.certificate_templates;
    const templateObj = Array.isArray(rawTemplate) ? rawTemplate[0] : rawTemplate;
    let templateName = templateObj?.name ?? null;

    if (!templateName) {
      const { data: defaultTpl } = await context.supabase
        .from("certificate_templates")
        .select("id, name")
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();
      templateName = defaultTpl?.name ?? null;
    }

    const origin = getAppOrigin();
    const pdfBuffer = await generateCertificatePdf({
      certificateNumber: cert.certificate_number,
      holderName: cert.holder_name,
      certificationTitle: cert.certification_title,
      issueDate: cert.issue_date,
      expiryDate: cert.expiry_date,
      grade: cert.grade,
      issuingAuthority: cert.issuing_authority,
      status: cert.status,
      templateName,
      templateData: cert.template_data as Record<string, string | null | undefined> | null,
      baseOrigin: origin,
    });

    return {
      filename: `${cert.certificate_number}.pdf`,
      pdfBase64: pdfBuffer.toString("base64"),
    };
  });

export const getCertificateRenderedHtml = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ certificateId: z.string().uuid("Invalid certificate ID") }).parse(data),
  )
  .handler(async ({ context, data }) => {
    const { data: cert, error: certErr } = await context.supabase
      .from("certificates")
      .select(
        "id, certificate_number, holder_name, certification_title, issue_date, expiry_date, grade, issuing_authority, status, template_id, template_data, certificate_templates(id, name, html)",
      )
      .eq("id", data.certificateId)
      .maybeSingle();

    if (certErr || !cert) {
      throw new Error("Certificate not found.");
    }

    const rawTemplate = cert.certificate_templates;
    const templateObj = Array.isArray(rawTemplate) ? rawTemplate[0] : rawTemplate;
    let templateHtml = templateObj?.html ?? null;
    let templateName = templateObj?.name ?? null;

    if (!templateHtml) {
      const { data: defaultTpl } = await context.supabase
        .from("certificate_templates")
        .select("id, name, html")
        .eq("is_default", true)
        .limit(1)
        .maybeSingle();
      templateHtml = defaultTpl?.html ?? null;
      templateName = defaultTpl?.name ?? templateName;
    }

    const origin = getAppOrigin();
    const verificationUrl = buildVerificationUrl(cert.certificate_number, origin);

    const renderedHtml = templateHtml
      ? renderTemplate(templateHtml, {
          certificate_number: cert.certificate_number,
          holder_name: cert.holder_name,
          certification_title: cert.certification_title,
          issue_date: cert.issue_date,
          expiry_date: cert.expiry_date,
          grade: cert.grade,
          issuing_authority: cert.issuing_authority,
          status: cert.status,
          verification_url: verificationUrl,
          ...((cert.template_data as Record<string, string>) ?? {}),
        })
      : null;

    return {
      certificateNumber: cert.certificate_number,
      templateName,
      renderedHtml,
    };
  });
