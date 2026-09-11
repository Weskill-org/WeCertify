// Supabase Edge Function: send-certificate-email
// Dispatches official certificate emails via Custom SMTP

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.9";
import QRCode from "npm:qrcode@1.5.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailPayload {
  certificateId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  html?: string;
  pdfBase64?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    // Verify authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized: Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify role: admin or issuer
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const userRoles = (roles ?? []).map((r: { role: string }) => r.role);
    if (!userRoles.includes("admin") && !userRoles.includes("issuer")) {
      return new Response(
        JSON.stringify({ error: "Access denied: Administrator or Issuer role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload: EmailPayload = await req.json();
    const { certificateId, recipientEmail, subject, body, html } = payload;

    if (!certificateId || !recipientEmail || !subject || !body) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: certificateId, recipientEmail, subject, body",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch certificate
    const { data: cert, error: certError } = await supabaseClient
      .from("certificates")
      .select(
        "id, certificate_number, holder_name, certification_title, issue_date, expiry_date, grade, issuing_authority",
      )
      .eq("id", certificateId)
      .maybeSingle();

    if (certError || !cert) {
      return new Response(JSON.stringify({ error: "Certificate not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch email settings
    const { data: settings } = await supabaseClient
      .from("smtp_settings")
      .select("host, port, secure, user_name, password, from_name, from_email")
      .limit(1)
      .maybeSingle();

    const host = settings?.host?.trim();
    const port = settings?.port || 587;
    const secure = Boolean(settings?.secure);
    const userName = settings?.user_name?.trim();
    const password = settings?.password || "";
    const fromName = settings?.from_name || "WeCertify by Weskill";
    const fromEmail = settings?.from_email || "certificates@weskill.org";

    if (!host || !userName) {
      return new Response(
        JSON.stringify({
          error:
            "Custom SMTP server is not configured. Please configure your SMTP credentials in Email Settings to deliver emails.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const providerUsed = "smtp";
    let deliveryMessageId = "";
    const nowIso = new Date().toISOString();
    const pdfFileName = `${cert.certificate_number}.pdf`;

    let pdfBytes: Uint8Array | null = null;
    if (payload.pdfBase64 && payload.pdfBase64.trim().length > 0) {
      const binaryString = atob(payload.pdfBase64.trim());
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      pdfBytes = bytes;
    } else {
      try {
        const doc = await PDFDocument.create();
        const width = 841.89;
        const height = 595.28;
        const page = doc.addPage([width, height]);
        const helvetica = await doc.embedFont(StandardFonts.Helvetica);
        const helveticaBold = await doc.embedFont(StandardFonts.HelveticaBold);
        const timesRomanBold = await doc.embedFont(StandardFonts.TimesRomanBold);

        const gold = rgb(201 / 255, 162 / 255, 39 / 255);
        const darkNavy = rgb(15 / 255, 23 / 255, 42 / 255);
        const slate = rgb(71 / 255, 85 / 255, 105 / 255);

        // Background
        page.drawRectangle({
          x: 0,
          y: 0,
          width,
          height,
          color: rgb(253 / 255, 252 / 255, 248 / 255),
        });

        // Double border
        page.drawRectangle({
          x: 22,
          y: 22,
          width: width - 44,
          height: height - 44,
          borderColor: gold,
          borderWidth: 3,
        });
        page.drawRectangle({
          x: 30,
          y: 30,
          width: width - 60,
          height: height - 60,
          borderColor: rgb(235 / 255, 210 / 255, 130 / 255),
          borderWidth: 1,
        });

        // Header
        const authName = (
          cert.issuing_authority || "Weskill Certification Authority"
        ).toUpperCase();
        page.drawText(authName, {
          x: (width - helveticaBold.widthOfTextAtSize(authName, 15)) / 2,
          y: height - 74,
          size: 15,
          font: helveticaBold,
          color: darkNavy,
        });

        // Title
        const title = "Certificate of Achievement";
        page.drawText(title, {
          x: (width - timesRomanBold.widthOfTextAtSize(title, 26)) / 2,
          y: height - 128,
          size: 26,
          font: timesRomanBold,
          color: darkNavy,
        });

        // Recipient
        const rName = cert.holder_name || "Recipient";
        page.drawText(rName, {
          x: (width - timesRomanBold.widthOfTextAtSize(rName, 28)) / 2,
          y: height - 192,
          size: 28,
          font: timesRomanBold,
          color: darkNavy,
        });

        // Program
        const pTitle = cert.certification_title || "Official Credential";
        page.drawText(pTitle, {
          x: (width - helveticaBold.widthOfTextAtSize(pTitle, 17)) / 2,
          y: height - 252,
          size: 17,
          font: helveticaBold,
          color: darkNavy,
        });

        // Bottom Left details
        page.drawText(`Certificate ID: ${cert.certificate_number}`, {
          x: 54,
          y: 90,
          size: 12,
          font: helveticaBold,
          color: darkNavy,
        });
        page.drawText(`Issued: ${cert.issue_date}`, {
          x: 54,
          y: 72,
          size: 10,
          font: helvetica,
          color: slate,
        });

        // QR Code
        const verifyUrl = `https://certify.weskill.org/?id=${encodeURIComponent(cert.certificate_number)}`;
        const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 128, margin: 1 });
        const qrBase64 = qrDataUrl.split(",")[1];
        const qrBinary = atob(qrBase64);
        const qrBytes = new Uint8Array(qrBinary.length);
        for (let j = 0; j < qrBinary.length; j++) qrBytes[j] = qrBinary.charCodeAt(j);
        const qrImg = await doc.embedPng(qrBytes);
        page.drawImage(qrImg, {
          x: (width - 64) / 2,
          y: 60,
          width: 64,
          height: 64,
        });

        pdfBytes = await doc.save();
      } catch (pdfErr) {
        console.error("PDF generation failed in edge function:", pdfErr);
      }
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: userName ? { user: userName, pass: password } : undefined,
        connectionTimeout: 15000,
      });

      const attachments = pdfBytes
        ? [
            {
              filename: pdfFileName,
              content: pdfBytes,
              contentType: "application/pdf",
            },
          ]
        : undefined;

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: recipientEmail.trim(),
        subject,
        text: body,
        html: html || undefined,
        attachments,
      });

      deliveryMessageId = info.messageId || `smtp_${Date.now()}`;
    } catch (sendError) {
      const errMsg = sendError instanceof Error ? sendError.message : "SMTP dispatch failed";
      console.error("SMTP dispatch error:", errMsg);

      // Record failure in logs
      await supabaseClient.from("certificate_email_logs").insert({
        certificate_id: certificateId,
        recipient_email: recipientEmail.trim(),
        subject,
        status: "failed",
        provider: providerUsed,
        error_message: errMsg,
        metadata: { attemptedAt: nowIso },
      });

      return new Response(
        JSON.stringify({
          error: `SMTP delivery failed: ${errMsg}`,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 1. Update certificates table
    await supabaseClient
      .from("certificates")
      .update({
        recipient_email: recipientEmail.trim(),
        email_sent_at: nowIso,
      })
      .eq("id", certificateId);

    // 2. Insert audit log
    await supabaseClient.from("certificate_email_logs").insert({
      certificate_id: certificateId,
      recipient_email: recipientEmail.trim(),
      subject,
      status: "sent",
      provider: providerUsed,
      metadata: {
        messageId: deliveryMessageId,
        sentBy: user.id,
        sentAt: nowIso,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        messageId: deliveryMessageId,
        sentAt: nowIso,
        recipient: recipientEmail.trim(),
        provider: providerUsed,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Supabase Edge Function error:", error);
    const message = error instanceof Error ? error.message : "Internal function error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
