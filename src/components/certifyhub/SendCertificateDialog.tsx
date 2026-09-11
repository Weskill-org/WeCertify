import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  LayoutTemplate,
  Loader2,
  Mail,
  Paperclip,
  Send,
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
import { TemplatePreview } from "@/components/certifyhub/TemplatePreview";
import {
  getCertificatePdf,
  getCertificateRenderedHtml,
  getSmtpSettings,
  replacePlaceholders,
  sendCertificateEmail,
  type SmtpPublicConfig,
} from "@/lib/smtp.functions";
import { buildVerificationUrl } from "@/lib/qr";
import { downloadPdfFromBase64 } from "@/lib/html-to-pdf";
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
  onOpenEmailSettings,
  onOpenSmtpSettings,
  onEmailSent,
}: SendCertificateDialogProps) {
  const fetchSettings = useServerFn(getSmtpSettings);
  const sendEmail = useServerFn(sendCertificateEmail);
  const fetchPdf = useServerFn(getCertificatePdf);
  const fetchRenderedHtml = useServerFn(getCertificateRenderedHtml);

  const handleOpenSettings = onOpenEmailSettings || onOpenSmtpSettings;

  const [loadingConfig, setLoadingConfig] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [emailConfig, setEmailConfig] = useState<SmtpPublicConfig | null>(null);
  const [renderedCertHtml, setRenderedCertHtml] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
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
      if (!certificate) return;
      const certId = certificate.id;
      setLoadingConfig(true);
      try {
        const [config, htmlData] = await Promise.all([
          fetchSettings({}),
          fetchRenderedHtml({ data: { certificateId: certId } }),
        ]);

        setEmailConfig(config);
        if (htmlData) {
          setRenderedCertHtml(htmlData.renderedHtml);
          setTemplateName(htmlData.templateName);
        }

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
        console.error("Failed to load email settings or template HTML:", err);
      } finally {
        setLoadingConfig(false);
      }
    }

    void init();
  }, [open, certificate, certData, fetchSettings, fetchRenderedHtml]);

  async function handleDownloadPdf() {
    if (!certificate) return;
    setDownloadingPdf(true);
    try {
      const res = await fetchPdf({ data: { certificateId: certificate.id } });
      downloadPdfFromBase64(res.pdfBase64, res.filename);
    } catch (err) {
      console.error("PDF download error:", err);
      setStatusMessage({
        type: "error",
        text: "Could not generate certificate PDF download.",
      });
    } finally {
      setDownloadingPdf(false);
    }
  }

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

      const messageText = `Certificate successfully emailed to ${result.recipient}!`;
      setStatusMessage({
        type: "success",
        text: messageText,
      });
      onEmailSent?.();

      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to dispatch certificate email.",
      });
    } finally {
      setSending(false);
    }
  }

  if (!certificate) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl p-5 sm:p-6 overflow-hidden">
          {/* Header */}
          <DialogHeader className="space-y-1 pb-1">
            {isPostCreation ? (
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald/40 bg-emerald/10 px-2.5 py-0.5 text-xs font-semibold text-emerald">
                  <CheckCircle2 className="size-3" />
                  Step 1: Certificate Issued
                </div>
                <DialogTitle className="text-lg font-bold font-display flex items-center gap-2">
                  <Mail className="size-4 text-gold" />
                  Step 2: Email Certificate to Recipient
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Deliver official credential notification with the verified PDF attached.
                </DialogDescription>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-gold/15 text-gold shrink-0">
                  <Mail className="size-4.5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold font-display">
                    Send Certificate via Email
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Deliver official credential notification with the verified PDF attached.
                  </DialogDescription>
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Compact Credential & Attachment Summary Card */}
          <div className="rounded-xl border border-border/80 bg-surface/50 p-3.5 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Recipient:</span>
                  <span className="text-sm font-semibold text-foreground truncate">{certificate.holder_name}</span>
                </div>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {certificate.certification_title}
                </p>
              </div>

              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="font-mono text-xs font-bold text-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50">
                  {certificate.certificate_number}
                </span>
                {templateName && (
                  <span className="inline-flex items-center gap-1 rounded bg-gold/10 text-gold px-2 py-0.5 text-[10px] font-semibold border border-gold/25">
                    <LayoutTemplate className="size-2.5" />
                    {templateName}
                  </span>
                )}
              </div>
            </div>

            {/* Attachment Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-border/50 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Paperclip className="size-3.5 text-emerald" />
                <span className="font-mono font-medium text-foreground text-[11px]">
                  {certificate.certificate_number}.pdf
                </span>
                <span className="rounded bg-emerald/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald uppercase tracking-wider">
                  PDF Attached
                </span>
              </div>

              <div className="flex items-center gap-2">
                {renderedCertHtml && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPreviewModalOpen(true)}
                    className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground px-2"
                  >
                    <Eye className="size-3 text-gold" />
                    Preview Design
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  className="h-7 text-xs gap-1.5 border-border hover:bg-surface px-2.5 shrink-0"
                >
                  {downloadingPdf ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Download className="size-3 text-muted-foreground" />
                  )}
                  Download PDF
                </Button>
              </div>
            </div>
          </div>

          {/* Delivery Provider Warning if not configured */}
          {!emailConfig?.isConfigured && (
            <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-500 dark:text-amber-400">
              <div className="flex items-center gap-2">
                <AlertCircle className="size-3.5 shrink-0" />
                <span>
                  <strong>SMTP not configured:</strong> Configure SMTP in Email Settings to deliver emails.
                </span>
              </div>
              {handleOpenSettings && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    handleOpenSettings();
                  }}
                  className="h-6 text-[11px] border-amber-500/40 text-amber-500 hover:bg-amber-500/20 px-2"
                >
                  Configure
                </Button>
              )}
            </div>
          )}

          {/* Status Alert */}
          {statusMessage && (
            <div
              role="status"
              className={`rounded-xl border p-3 text-xs font-medium flex items-center gap-2.5 ${
                statusMessage.type === "success"
                  ? "border-emerald/40 bg-emerald/10 text-emerald"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : (
                <AlertCircle className="size-4 shrink-0" />
              )}
              <div>{statusMessage.text}</div>
            </div>
          )}

          {/* Form */}
          {loadingConfig ? (
            <div className="flex h-32 items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-4 animate-spin text-gold" /> Loading email settings…
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-3.5">
              <div className="space-y-1">
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
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailSubject" className="text-xs font-semibold">
                    Email Subject
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Editable</span>
                </div>
                <Input
                  id="emailSubject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Your Certificate is Ready"
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="emailBody" className="text-xs font-semibold">
                    Message Body
                  </Label>
                  <span className="text-[10px] text-muted-foreground">
                    Variables auto-filled • Editable
                  </span>
                </div>
                <Textarea
                  id="emailBody"
                  required
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="font-mono text-xs leading-relaxed resize-none"
                />
              </div>

              <div className="flex items-center justify-between border-t border-border/70 pt-3">
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  {emailConfig?.isConfigured && (
                    <span className="flex items-center gap-1 text-emerald font-medium">
                      <ShieldCheck className="size-3 text-emerald" />
                      Via SMTP ({emailConfig.fromEmail})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onOpenChange(false)}
                    disabled={sending}
                    className="text-xs text-muted-foreground h-8"
                  >
                    {isPostCreation ? "Skip for now" : "Cancel"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={sending || !recipientEmail.trim()}
                    className="bg-gold hover:bg-gold-dark text-gold-foreground font-semibold px-4 h-8 text-xs shadow-gold gap-1.5"
                  >
                    {sending ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Send className="size-3" />
                    )}
                    {sending ? "Sending…" : "Send Email"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Dedicated Fullscreen Preview Modal */}
      {previewModalOpen && renderedCertHtml && (
        <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
          <DialogContent className="max-w-4xl p-5 sm:p-6">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-lg font-bold font-display flex items-center gap-2">
                <LayoutTemplate className="size-4 text-gold" />
                Certificate Preview: {templateName || "Assigned Design"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                High-resolution preview of the assigned certificate template. This design is attached to the email as a PDF.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3">
              <TemplatePreview
                html={renderedCertHtml}
                title="Certificate preview"
                className="h-[460px] w-full rounded-xl border border-border bg-white"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
