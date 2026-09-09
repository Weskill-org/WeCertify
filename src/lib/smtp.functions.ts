import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import nodemailer from "nodemailer";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { buildVerificationUrl, CANONICAL_VERIFY_BASE_URL } from "@/lib/qr";

export type SmtpPublicConfig = {
  isConfigured: boolean;
  host: string;
  port: number;
  secure: boolean;
  userName: string;
  hasPassword: boolean;
  fromEmail: string;
  fromName: string;
  defaultSubject: string;
  defaultBody: string;
  updatedAt?: string;
};

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
      throw new Error("You do not have permission to access SMTP settings.");
    }

    const { data: row, error } = await context.supabase
      .from("smtp_settings")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load SMTP settings: ${error.message}`);
    }

    const isConfigured = Boolean(row?.host && row?.from_email);

    if (!row) {
      return {
        isConfigured: false,
        host: "",
        port: 587,
        secure: false,
        userName: "",
        hasPassword: false,
        fromEmail: "",
        fromName: "WeCertify by Weskill",
        defaultSubject:
          "Your Certificate for {{certification_title}} is Ready - {{certificate_number}}",
        defaultBody:
          "Dear {{holder_name}},\n\nCongratulations! Your certificate for {{certification_title}} has been issued.\n\nCertificate ID: {{certificate_number}}\nIssue Date: {{issue_date}}\n\nVerify online:\n{{verification_url}}\n\nBest regards,\n{{issuing_authority}}",
      };
    }

    return {
      isConfigured,
      host: isAdmin ? row.host : "",
      port: isAdmin ? row.port : 587,
      secure: isAdmin ? row.secure : false,
      userName: isAdmin ? row.user_name : "",
      hasPassword: Boolean(row.password && row.password.trim().length > 0),
      fromEmail: row.from_email,
      fromName: row.from_name,
      defaultSubject: row.default_subject,
      defaultBody: row.default_body,
      updatedAt: row.updated_at,
    };
  });

const saveSmtpSchema = z.object({
  host: z.string().trim().min(1, "Host is required").max(200),
  port: z.coerce.number().int().min(1).max(65535).default(587),
  secure: z.boolean().default(false),
  userName: z.string().trim().max(150).default(""),
  password: z.string().max(250).optional().or(z.literal("")),
  fromEmail: z.string().trim().email("Enter a valid from email").max(150),
  fromName: z.string().trim().min(1, "Sender name is required").max(150),
  defaultSubject: z.string().trim().min(1, "Default subject is required").max(250),
  defaultBody: z.string().min(10, "Default email body is too short").max(10000),
});

export const saveSmtpSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => saveSmtpSchema.parse(data))
  .handler(async ({ context, data }) => {
    // Check admin
    const { data: roleData } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (roleData ?? []).map((r) => r.role);
    if (!roles.includes("admin")) {
      throw new Error("Only administrators can configure SMTP settings.");
    }

    // Get existing record to retain password if not updated
    const { data: existing } = await context.supabase
      .from("smtp_settings")
      .select("id, password")
      .limit(1)
      .maybeSingle();

    const passwordToSave =
      data.password && data.password.trim().length > 0
        ? data.password.trim()
        : (existing?.password ?? "");

    const payload = {
      host: data.host,
      port: data.port,
      secure: data.secure,
      user_name: data.userName,
      password: passwordToSave,
      from_email: data.fromEmail,
      from_name: data.fromName,
      default_subject: data.defaultSubject,
      default_body: data.defaultBody,
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
      throw new Error(`Failed to save SMTP settings: ${saveError.message}`);
    }

    return { ok: true };
  });

const testSmtpSchema = z.object({
  testRecipientEmail: z
    .string()
    .trim()
    .email("Enter a valid test email")
    .optional()
    .or(z.literal("")),
});

export const testSmtpConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => testSmtpSchema.parse(data))
  .handler(async ({ context, data }) => {
    // Verify admin
    const { data: roleData } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const roles = (roleData ?? []).map((r) => r.role);
    if (!roles.includes("admin")) {
      throw new Error("Only administrators can test the SMTP connection.");
    }

    const { data: smtp, error } = await context.supabase
      .from("smtp_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (error || !smtp || !smtp.host) {
      throw new Error(
        "SMTP is not configured yet. Please configure and save your SMTP host and credentials first.",
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user_name ? { user: smtp.user_name, pass: smtp.password } : undefined,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
    });

    try {
      await transporter.verify();
    } catch (verifyErr: unknown) {
      const msg = verifyErr instanceof Error ? verifyErr.message : "SMTP handshake failed";
      throw new Error(`SMTP connection verification failed: ${msg}`);
    }

    if (data.testRecipientEmail && data.testRecipientEmail.trim().length > 0) {
      try {
        await transporter.sendMail({
          from: `"${smtp.from_name || "WeCertify"}" <${smtp.from_email}>`,
          to: data.testRecipientEmail.trim(),
          subject: "[WeCertify] Test Email — SMTP Connected Successfully",
          text: `Hello!\n\nThis is a test email from WeCertify to confirm that your SMTP server configuration (${smtp.host}:${smtp.port}) is working perfectly.\n\nTime: ${new Date().toISOString()}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0;">
              <div style="background: linear-gradient(135deg, #0b1b33 0%, #162a4d 100%); padding: 24px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
                <h1 style="color: #f7f5ef; margin: 0; font-size: 22px;">WeCertify</h1>
                <p style="color: #c9a227; margin: 6px 0 0; font-size: 13px; letter-spacing: 0.1em; text-transform: uppercase;">Official Weskill Registry</p>
              </div>
              <h2 style="color: #0f172a; margin: 0 0 12px; font-size: 18px;">SMTP Configuration Verified!</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                This test message confirms that your SMTP server (<strong>${smtp.host}:${smtp.port}</strong>) is connected and ready to send certificates to recipients.
              </p>
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #64748b;">
                <strong>Sender:</strong> ${smtp.from_name} &lt;${smtp.from_email}&gt;<br/>
                <strong>Security:</strong> ${smtp.secure ? "SSL (Port 465)" : "TLS/STARTTLS"}<br/>
                <strong>Timestamp:</strong> ${new Date().toLocaleString()}
              </div>
            </div>
          `,
        });
      } catch (sendErr: unknown) {
        const msg = sendErr instanceof Error ? sendErr.message : "Failed to dispatch test email";
        throw new Error(
          `SMTP connected, but failed to send test email to ${data.testRecipientEmail}: ${msg}`,
        );
      }
    }

    return {
      ok: true,
      message: data.testRecipientEmail
        ? `SMTP verified and test email sent to ${data.testRecipientEmail}!`
        : "SMTP connection verified successfully!",
    };
  });

const sendEmailSchema = z.object({
  certificateId: z.string().uuid("Invalid certificate ID"),
  recipientEmail: z.string().trim().email("Valid recipient email is required"),
  subject: z.string().trim().min(1, "Subject is required").max(300),
  body: z.string().min(5, "Body is required").max(15000),
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

    // Fetch SMTP settings
    const { data: smtp, error: smtpErr } = await context.supabase
      .from("smtp_settings")
      .select("*")
      .limit(1)
      .maybeSingle();

    if (smtpErr || !smtp || !smtp.host || !smtp.from_email) {
      throw new Error(
        "SMTP is not configured yet. Please have an Administrator set up SMTP in Settings first.",
      );
    }

    // Fetch Certificate details
    const { data: cert, error: certErr } = await context.supabase
      .from("certificates")
      .select(
        "id, certificate_number, holder_name, certification_title, issue_date, expiry_date, grade, issuing_authority, status",
      )
      .eq("id", data.certificateId)
      .maybeSingle();

    if (certErr || !cert) {
      throw new Error("Certificate not found.");
    }

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

    const htmlEmail = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${finalSubject}</title>
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
                ${escapedBody}
              </div>

              <!-- Certificate Detail Card -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin: 28px 0; padding: 20px;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #0284c7; margin-bottom: 12px;">Verified Credential Details</div>
                    <table width="100%" cellpadding="4" cellspacing="0" style="font-size: 14px;">
                      <tr>
                        <td width="35%" style="color: #64748b; font-weight: 500;">Recipient:</td>
                        <td style="color: #0f172a; font-weight: 600;">${cert.holder_name}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Programme:</td>
                        <td style="color: #0f172a; font-weight: 600;">${cert.certification_title}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Certificate ID:</td>
                        <td style="color: #0f172a; font-family: monospace; font-weight: 700;">${cert.certificate_number}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Issue Date:</td>
                        <td style="color: #0f172a;">${cert.issue_date}</td>
                      </tr>
                      ${
                        cert.grade
                          ? `
                      <tr>
                        <td style="color: #64748b; font-weight: 500;">Grade:</td>
                        <td style="color: #0f172a;">${cert.grade}</td>
                      </tr>`
                          : ""
                      }
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Call to Action Button -->
              <div style="text-align: center; margin: 36px 0 20px;">
                <a href="${verificationUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #b89728 100%); color: #0b1b33; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(212, 175, 55, 0.35);">
                  View &amp; Verify Certificate
                </a>
                <p style="margin: 12px 0 0; font-size: 12px; color: #94a3b8;">
                  Or copy this direct link: <a href="${verificationUrl}" style="color: #0284c7; text-decoration: underline;">${verificationUrl}</a>
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                This authentic digital credential was issued by <strong>${cert.issuing_authority}</strong> through the WeCertify registry.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user_name ? { user: smtp.user_name, pass: smtp.password } : undefined,
      connectionTimeout: 15000,
    });

    const senderDisplay = `"${smtp.from_name || "WeCertify"}" <${smtp.from_email}>`;

    const info = await transporter.sendMail({
      from: senderDisplay,
      to: data.recipientEmail.trim(),
      subject: finalSubject,
      text: finalBodyText,
      html: htmlEmail,
    });

    const nowIso = new Date().toISOString();

    // Update certificate in database
    await context.supabase
      .from("certificates")
      .update({
        recipient_email: data.recipientEmail.trim(),
        email_sent_at: nowIso,
      })
      .eq("id", data.certificateId);

    return {
      ok: true,
      messageId: info.messageId,
      sentAt: nowIso,
      recipient: data.recipientEmail.trim(),
    };
  });
