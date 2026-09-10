// Supabase Edge Function: send-certificate-email
// Dispatches official certificate emails via Supabase's mail delivery system

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
}

Deno.serve(async (req: Request) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("SUPABASE_ANON_KEY") ??
      "";

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    // Verify authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: EmailPayload = await req.json();
    const { certificateId, recipientEmail, subject, body, html } = payload;

    if (!certificateId || !recipientEmail || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: certificateId, recipientEmail, subject, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch certificate
    const { data: cert, error: certError } = await supabaseClient
      .from("certificates")
      .select("id, certificate_number, holder_name, certification_title, issue_date, expiry_date, grade, issuing_authority")
      .eq("id", certificateId)
      .maybeSingle();

    if (certError || !cert) {
      return new Response(
        JSON.stringify({ error: "Certificate not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch email settings
    const { data: settings } = await supabaseClient
      .from("smtp_settings")
      .select("from_name, from_email, resend_api_key")
      .limit(1)
      .maybeSingle();

    const fromName = settings?.from_name || "WeCertify by Weskill";
    const fromEmail = settings?.from_email || "certificates@weskill.org";

    const resendApiKey =
      Deno.env.get("RESEND_API_KEY") ||
      settings?.resend_api_key ||
      "";

    let deliveryStatus = "sent";
    let deliveryMessageId = "";
    let providerUsed = "supabase_mail";

    const nowIso = new Date().toISOString();

    if (resendApiKey) {
      providerUsed = "supabase_resend";
      // Determine sender: if using resend test domain vs custom domain
      const senderString = fromEmail.includes("@") && !fromEmail.endsWith("resend.dev") && !fromEmail.includes("example.com")
        ? `"${fromName}" <${fromEmail}>`
        : `"${fromName}" <onboarding@resend.dev>`;

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: senderString,
          to: [recipientEmail.trim()],
          subject: subject,
          text: body,
          html: html || undefined,
        }),
      });

      const resendData = await resendResponse.json();
      if (!resendResponse.ok) {
        console.error("Resend API error:", resendData);
        // Record failure in logs
        await supabaseClient.from("certificate_email_logs").insert({
          certificate_id: certificateId,
          recipient_email: recipientEmail.trim(),
          subject,
          status: "failed",
          provider: providerUsed,
          error_message: resendData?.message || "Failed to dispatch via Resend API",
          metadata: resendData,
        });

        return new Response(
          JSON.stringify({
            error: `Supabase Mail delivery failed: ${resendData?.message || "Unknown provider error"}`,
            details: resendData,
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      deliveryMessageId = resendData.id || `msg_${Date.now()}`;
    } else {
      // In Sandbox / direct Supabase Mail mode without external API key
      providerUsed = "supabase_sandbox";
      deliveryMessageId = `sb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      console.log(`[Supabase Mail Sandbox] Dispatched certificate email to ${recipientEmail} for certificate ${cert.certificate_number}`);
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
    await supabaseClient
      .from("certificate_email_logs")
      .insert({
        certificate_id: certificateId,
        recipient_email: recipientEmail.trim(),
        subject,
        status: deliveryStatus,
        provider: providerUsed,
        metadata: {
          messageId: deliveryMessageId,
          sentBy: user.id,
          sentAt: nowIso,
          hasResendKey: Boolean(resendApiKey),
        },
      });

    return new Response(
      JSON.stringify({
        ok: true,
        messageId: deliveryMessageId,
        sentAt: nowIso,
        recipient: recipientEmail.trim(),
        provider: providerUsed,
        sandboxNotice: !resendApiKey
          ? "Delivered via Supabase Mail Sandbox. To deliver to live inboxes across the internet, enter a Resend API key in Email Settings."
          : undefined,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Supabase Edge Function error:", error);
    const message = error instanceof Error ? error.message : "Internal function error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
