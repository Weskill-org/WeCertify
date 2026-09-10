import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  Sparkles,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getSmtpSettings,
  replacePlaceholders,
  sendCertificateEmail,
  type SmtpPublicConfig,
} from "@/lib/smtp.functions";
import { buildVerificationUrl } from "@/lib/qr";
import type { ManagedCertificate } from "@/lib/admin.functions";

interface SendCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  certificate: ManagedCertificate | null;
  isPostCreation?: boolean;
  isAdmin?: boolean;
  onOpenSmtpSettings?: () => void;
  onOpenEmailSettings?: () => void;
  onEmailSent?: () => void;
}

export function SendCertificateDialog({
  open,
  onOpenChange,
  certificate,
  isPostCreation = false,
  onEmailSent,
}: SendCertificateDialogProps) {
  const fetchSettings = useServerFn(getSmtpSettings);
  const sendEmail = useServerFn(sendCertificateEmail);

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [, setEmailConfig] = useState<SmtpPublicConfig | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const certData = useMemo(() => {
    if (!certificate) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const verificationUrl = buildVerificationUrl(certificate.certificate_number, origin);

    return {
      holder_name: certificate.holder_name,
      certification_title: certificate.certification_title,
      certificate_number: certificate.certificate_number,
      issue_date: certificate.issue_date,
      expiry_date: certificate.expiry_date ?? "Permanent",
      grade: certificate.grade ?? "",
      issuing_authority: certificate.issuing_authority,
      verification_url: verificationUrl,
      recipient_email: certificate.recipient_email ?? "",
    };
  }, [certificate]);

  useEffect(() => {
    if (!open || !certificate) return;

    setStatusMessage(null);
    setRecipientEmail(certificate.recipient_email || "");

    async function init() {
      setLoadingConfig(true);
      try {
        const config = await fetchSettings({});
        setEmailConfig(config);

        if (certData) {
          const templatedSubject = replacePlaceholders(
            config.defaultSubject ||
              "Your {{certification_title}} Certificate is Ready - {{certificate_number}}",
            certData,
          );
          const templatedBody = replacePlaceholders(config.defaultBody || "", certData);

          setSubject(templatedSubject);
          setBody(templatedBody);
        }
      } catch (err) {
        console.error("Failed to load email settings:", err);
      } finally {
        setLoadingConfig(false);
      }
    }

    void init();
  }, [open, certificate, certData, fetchSettings]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!certificate) return;

    if (!recipientEmail.trim()) {
      setStatusMessage({ type: "error", text: "Please enter a valid recipient email address." });
      return;
    }

    setSending(true);
    setStatusMessage(null);

    try {
      const result = await sendEmail({
        data: {
          certificateId: certificate.id,
          recipientEmail: recipientEmail.trim(),
          subject: subject.trim(),
          body: body.trim(),
        },
      });

      const messageText = result.sandboxNotice
        ? `Certificate email dispatched via Supabase Mail to ${result.recipient}!`
        : `Certificate successfully emailed to ${result.recipient} via Supabase Mail!`;

      setStatusMessage({
        type: "success",
        text: messageText,
      });
      onEmailSent?.();

      // Automatically close after a brief delay so the user sees the confirmation
      setTimeout(() => {
        onOpenChange(false);
      }, 1800);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to dispatch certificate email via Supabase.",
      });
    } finally {
      setSending(false);
    }
  }

  if (!certificate) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          {isPostCreation ? (
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald/40 bg-emerald/10 px-3 py-1 text-xs font-semibold text-emerald">
                <CheckCircle2 className="size-3.5" />
                Step 1: Certificate Issued &amp; Verified
              </div>
              <DialogTitle className="text-xl font-bold font-display flex items-center gap-2">
                <Mail className="size-5 text-gold" />
                Next Step: Email Certificate to Recipient
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                The certificate is registered in the official registry. Dispatched via Supabase Mail
                directly to the recipient's inbox.
              </DialogDescription>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-xl bg-gold/15 text-gold">
                <Mail className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold font-display">
                  Send Certificate via Email
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Deliver official credential notification through Supabase Mail system.
                </DialogDescription>
              </div>
            </div>
          )}
        </DialogHeader>

        {/* Certificate Quick Details Card */}
        <div className="rounded-2xl border border-border/80 bg-surface/50 p-4 sm:p-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Award className="size-3.5 text-gold" />
              Credential Summary
            </span>
            <span className="font-mono text-xs font-semibold text-foreground">
              {certificate.certificate_number}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div>
              <span className="text-muted-foreground">Recipient: </span>
              <span className="font-medium text-foreground">{certificate.holder_name}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Issue Date: </span>
              <span className="font-medium text-foreground">{certificate.issue_date}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Programme: </span>
              <span className="font-medium text-foreground">{certificate.certification_title}</span>
            </div>
          </div>
        </div>

        {/* Delivery Indicator */}
        <div className="flex items-center gap-2 rounded-xl border border-emerald/30 bg-emerald/10 px-3.5 py-2 text-xs text-emerald">
          <ShieldCheck className="size-3.5 shrink-0" />
          <span>Delivered securely via Supabase Mail system</span>
        </div>

        {statusMessage && (
          <div
            role="status"
            className={`rounded-xl border p-3.5 text-xs font-medium flex items-start gap-2.5 ${
              statusMessage.type === "success"
                ? "border-emerald/40 bg-emerald/10 text-emerald"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="size-4 shrink-0 mt-0.5" />
            )}
            <div>{statusMessage.text}</div>
          </div>
        )}

        {loadingConfig ? (
          <div className="flex h-36 items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-gold" /> Loading email template…
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="recipientEmail" className="text-xs font-semibold">
                Recipient Email Address
              </Label>
              <Input
                id="recipientEmail"
                type="email"
                required
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="recipient@example.com"
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="emailSubject" className="text-xs font-semibold">
                  Email Subject
                </Label>
                <span className="text-[11px] text-muted-foreground">Editable</span>
              </div>
              <Input
                id="emailSubject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Your Certificate is Ready"
                className="h-10 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="emailBody" className="text-xs font-semibold">
                  Message Body
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Default template applied • Editable
                </span>
              </div>
              <Textarea
                id="emailBody"
                required
                rows={7}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="font-mono text-xs leading-relaxed"
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="size-3 text-gold" />
                The recipient will also receive an official credential card and direct verification
                link.
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-border/80 pt-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={sending}
                className="text-xs text-muted-foreground"
              >
                {isPostCreation ? "Skip for now" : "Cancel"}
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  disabled={sending || !recipientEmail.trim()}
                  className="bg-gold hover:bg-gold-dark text-gold-foreground font-semibold px-5 shadow-gold gap-2"
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {sending ? "Sending via Supabase…" : "Send Email"}
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
