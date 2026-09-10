import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Copy,
  Info,
  Key,
  Loader2,
  Mail,
  Send,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getSmtpSettings,
  saveSmtpSettings,
  testSmtpConnection,
  replacePlaceholders,
  type SmtpPublicConfig,
} from "@/lib/smtp.functions";

interface EmailSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const TEMPLATE_VARIABLES = [
  { key: "{{holder_name}}", label: "Holder Name", sample: "Ananya Sharma" },
  {
    key: "{{certification_title}}",
    label: "Certification Title",
    sample: "Advanced Data Analytics",
  },
  { key: "{{certificate_number}}", label: "Certificate Number", sample: "WE-2026-000456" },
  { key: "{{issue_date}}", label: "Issue Date", sample: "2026-03-14" },
  { key: "{{grade}}", label: "Grade", sample: "Distinction" },
  {
    key: "{{verification_url}}",
    label: "Verification Link",
    sample: "https://certify.weskill.org/?id=WE-2026-000456",
  },
  { key: "{{issuing_authority}}", label: "Authority", sample: "Weskill Certification Authority" },
];

export function EmailSettingsDialog({ open, onOpenChange, onSaved }: EmailSettingsDialogProps) {
  const fetchSettings = useServerFn(getSmtpSettings);
  const storeSettings = useServerFn(saveSmtpSettings);
  const testDelivery = useServerFn(testSmtpConnection);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Form State
  const [fromEmail, setFromEmail] = useState("certificates@weskill.org");
  const [fromName, setFromName] = useState("WeCertify by Weskill");
  const [resendApiKey, setResendApiKey] = useState("");
  const [hasStoredApiKey, setHasStoredApiKey] = useState(false);
  const [defaultSubject, setDefaultSubject] = useState(
    "Your {{certification_title}} Certificate is Ready - {{certificate_number}}",
  );
  const [defaultBody, setDefaultBody] = useState("");
  const [testEmail, setTestEmail] = useState("");

  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [lastFocusedField, setLastFocusedField] = useState<"subject" | "body">("body");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const config: SmtpPublicConfig = await fetchSettings({});
      setFromEmail(config.fromEmail || "certificates@weskill.org");
      setFromName(config.fromName || "WeCertify by Weskill");
      setDefaultSubject(
        config.defaultSubject ||
          "Your {{certification_title}} Certificate is Ready - {{certificate_number}}",
      );
      setDefaultBody(config.defaultBody || "");
      setHasStoredApiKey(Boolean(config.hasResendApiKey));
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load email configuration.",
      });
    } finally {
      setLoading(false);
    }
  }, [fetchSettings]);

  useEffect(() => {
    if (open) {
      void loadSettings();
    }
  }, [open, loadSettings]);

  function insertVariable(variableKey: string) {
    if (lastFocusedField === "subject") {
      setDefaultSubject((prev) => prev + " " + variableKey);
    } else {
      setDefaultBody((prev) => prev + " " + variableKey);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      await storeSettings({
        data: {
          fromEmail: fromEmail.trim(),
          fromName: fromName.trim(),
          defaultSubject: defaultSubject.trim(),
          defaultBody: defaultBody.trim(),
          resendApiKey: resendApiKey.trim(),
        },
      });

      setStatusMessage({
        type: "success",
        text: "Email settings and templates saved successfully!",
      });
      if (resendApiKey) {
        setHasStoredApiKey(true);
        setResendApiKey("");
      }
      onSaved?.();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save email settings.",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest(e: React.FormEvent) {
    e.preventDefault();
    setTesting(true);
    setStatusMessage(null);

    try {
      const res = await testDelivery({
        data: {
          testRecipientEmail: testEmail.trim() || undefined,
        },
      });

      setStatusMessage({
        type: "success",
        text: res.message,
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Test email failed.",
      });
    } finally {
      setTesting(false);
    }
  }

  const samplePreviewData = {
    holder_name: "Ananya Sharma",
    certification_title: "Advanced Data Analytics",
    certificate_number: "WE-2026-000456",
    issue_date: "2026-03-14",
    grade: "Distinction",
    verification_url: "https://certify.weskill.org/?id=WE-2026-000456",
    issuing_authority: fromName || "Weskill Certification Authority",
  };

  const previewSubject = replacePlaceholders(defaultSubject, samplePreviewData);
  const previewBody = replacePlaceholders(defaultBody, samplePreviewData);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gold/15 text-gold">
              <Mail className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-display">
                Certificate Email Delivery
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Powered by Supabase Mail system. Manage your sender profile and notification templates.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Supabase Mail Status Badge */}
        <div className="flex items-center justify-between rounded-xl border border-emerald/30 bg-emerald/10 p-3.5 text-xs text-emerald">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-4 shrink-0 text-emerald" />
            <span>
              <strong>Supabase Mail System Active:</strong> Certificates are dispatched directly through your Supabase project with automated delivery logging.
            </span>
          </div>
        </div>

        {statusMessage && (
          <div
            role="status"
            className={`rounded-xl border p-3.5 text-xs font-medium flex items-start gap-2 ${
              statusMessage.type === "success"
                ? "border-emerald/40 bg-emerald/10 text-emerald"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
            <div>{statusMessage.text}</div>
          </div>
        )}

        {loading ? (
          <div className="flex h-48 items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="size-4 animate-spin text-gold" /> Loading email configuration…
          </div>
        ) : (
          <Tabs defaultValue="templates" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="templates" className="text-xs">
                Email Templates
              </TabsTrigger>
              <TabsTrigger value="sender" className="text-xs">
                Sender Profile &amp; Keys
              </TabsTrigger>
              <TabsTrigger value="test" className="text-xs">
                Send Test Email
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: Templates */}
            <TabsContent value="templates" className="space-y-4">
              <form onSubmit={handleSave} className="space-y-4">
                {/* Available Variables Chips */}
                <div className="rounded-xl border border-border/80 bg-surface/50 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-gold" />
                      Dynamic Variables
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Click variable to insert into active field ({lastFocusedField})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => insertVariable(v.key)}
                        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] font-mono hover:border-gold/50 hover:bg-gold/10 hover:text-gold transition-colors"
                        title={`Sample: ${v.sample}`}
                      >
                        <Copy className="size-2.5 opacity-60" />
                        {v.key}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="defaultSubject" className="text-xs font-semibold">
                    Default Email Subject
                  </Label>
                  <Input
                    id="defaultSubject"
                    required
                    value={defaultSubject}
                    onFocus={() => setLastFocusedField("subject")}
                    onChange={(e) => setDefaultSubject(e.target.value)}
                    placeholder="Your Certificate is Ready - {{certificate_number}}"
                    className="h-10 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="defaultBody" className="text-xs font-semibold">
                      Default Email Body
                    </Label>
                    <span className="text-[11px] text-muted-foreground">
                      Supports mustache conditionals like <code>&#123;&#123;#grade&#125;&#125;...&#123;&#123;/grade&#125;&#125;</code>
                    </span>
                  </div>
                  <Textarea
                    id="defaultBody"
                    required
                    rows={8}
                    value={defaultBody}
                    onFocus={() => setLastFocusedField("body")}
                    onChange={(e) => setDefaultBody(e.target.value)}
                    className="font-mono text-xs leading-relaxed"
                  />
                </div>

                {/* Live Sample Preview */}
                <div className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Live Sample Preview
                  </span>
                  <div className="rounded-lg border border-border/60 bg-surface/30 p-3 space-y-2 text-xs">
                    <div className="font-semibold text-foreground border-b border-border/40 pb-1.5">
                      Subject: {previewSubject}
                    </div>
                    <div className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                      {previewBody}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-gold hover:bg-gold-dark text-gold-foreground font-semibold px-5 shadow-gold gap-2"
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                    {saving ? "Saving…" : "Save Template Settings"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* TAB 2: Sender Profile & Resend API Key */}
            <TabsContent value="sender" className="space-y-4">
              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fromName" className="text-xs font-semibold">
                      Sender Name (From Name)
                    </Label>
                    <Input
                      id="fromName"
                      required
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="WeCertify by Weskill"
                      className="h-10 text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      The official sender name displayed in recipients' inbox.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fromEmail" className="text-xs font-semibold">
                      Sender Email Address
                    </Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      required
                      value={fromEmail}
                      onChange={(e) => setFromEmail(e.target.value)}
                      placeholder="certificates@weskill.org"
                      className="h-10 text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      The official sender email address.
                    </p>
                  </div>
                </div>

                {/* Optional Resend Key */}
                <div className="rounded-xl border border-border/80 bg-surface/40 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                      <Key className="size-3.5 text-gold" />
                      Optional: Custom Domain API Key (Resend)
                    </div>
                    {hasStoredApiKey && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald/40 bg-emerald/10 px-2 py-0.5 text-[10px] font-semibold text-emerald">
                        <CheckCircle2 className="size-2.5" /> Key Stored
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    By default, Supabase Mail dispatches certificates seamlessly. If your organization uses Resend with a custom verified domain (e.g., <code>yourdomain.com</code>), enter your Resend API Key below or set it as a Supabase Secret (<code>RESEND_API_KEY</code>).
                  </p>
                  <div className="relative">
                    <Input
                      type={showApiKey ? "text" : "password"}
                      value={resendApiKey}
                      onChange={(e) => setResendApiKey(e.target.value)}
                      placeholder={hasStoredApiKey ? "•••••••••••••••• (Leave blank to keep stored key)" : "re_123456789..."}
                      className="h-10 text-sm pr-10 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="bg-gold hover:bg-gold-dark text-gold-foreground font-semibold px-5 shadow-gold gap-2"
                  >
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
                    {saving ? "Saving…" : "Save Sender Settings"}
                  </Button>
                </div>
              </form>
            </TabsContent>

            {/* TAB 3: Test Dispatch */}
            <TabsContent value="test" className="space-y-4">
              <form onSubmit={handleTest} className="space-y-4">
                <div className="rounded-xl border border-border/80 bg-surface/50 p-4 space-y-2">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Info className="size-3.5 text-gold" />
                    Send Test Email via Supabase
                  </span>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Verify that Supabase Mail delivery is functioning properly. Enter an email address to receive a sample certificate delivery notification.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="testEmailInput" className="text-xs font-semibold">
                    Test Recipient Email
                  </Label>
                  <Input
                    id="testEmailInput"
                    type="email"
                    required
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="your-email@example.com"
                    className="h-10 text-sm"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                  <Button
                    type="submit"
                    disabled={testing}
                    className="bg-gold hover:bg-gold-dark text-gold-foreground font-semibold px-5 shadow-gold gap-2"
                  >
                    {testing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                    {testing ? "Testing Dispatch…" : "Send Test via Supabase"}
                  </Button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
