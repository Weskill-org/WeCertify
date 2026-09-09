import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  Info,
  Key,
  Loader2,
  Mail,
  Send,
  Server,
  Settings2,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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

interface SmtpSettingsDialogProps {
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

export function SmtpSettingsDialog({ open, onOpenChange, onSaved }: SmtpSettingsDialogProps) {
  const fetchSmtp = useServerFn(getSmtpSettings);
  const storeSmtp = useServerFn(saveSmtpSettings);
  const verifySmtp = useServerFn(testSmtpConnection);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [secure, setSecure] = useState(false);
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [hasStoredPassword, setHasStoredPassword] = useState(false);
  const [fromEmail, setFromEmail] = useState("");
  const [fromName, setFromName] = useState("WeCertify by Weskill");
  const [defaultSubject, setDefaultSubject] = useState(
    "Your {{certification_title}} Certificate is Ready - {{certificate_number}}",
  );
  const [defaultBody, setDefaultBody] = useState("");
  const [testEmail, setTestEmail] = useState("");

  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Active target for variable chip clicks: "subject" or "body"
  const [lastFocusedField, setLastFocusedField] = useState<"subject" | "body">("body");

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setStatusMessage(null);
    try {
      const config: SmtpPublicConfig = await fetchSmtp({});
      setHost(config.host || "");
      setPort(config.port || 587);
      setSecure(Boolean(config.secure));
      setUserName(config.userName || "");
      setHasStoredPassword(config.hasPassword);
      setPassword(""); // do not reveal stored pass
      setFromEmail(config.fromEmail || "");
      setFromName(config.fromName || "WeCertify by Weskill");
      setDefaultSubject(
        config.defaultSubject ||
          "Your {{certification_title}} Certificate is Ready - {{certificate_number}}",
      );
      setDefaultBody(config.defaultBody || "");
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to load SMTP settings",
      });
    } finally {
      setLoading(false);
    }
  }, [fetchSmtp]);

  useEffect(() => {
    if (open) {
      void loadSettings();
    } else {
      setStatusMessage(null);
    }
  }, [open, loadSettings]);

  function handleInsertVariable(token: string) {
    if (lastFocusedField === "subject") {
      setDefaultSubject((prev) => `${prev} ${token}`.trim());
    } else {
      setDefaultBody((prev) => `${prev} ${token}`.trim());
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatusMessage(null);

    try {
      await storeSmtp({
        data: {
          host,
          port: Number(port),
          secure,
          userName,
          password: password || undefined,
          fromEmail,
          fromName,
          defaultSubject,
          defaultBody,
        },
      });

      if (password) {
        setHasStoredPassword(true);
        setPassword("");
      }

      setStatusMessage({
        type: "success",
        text: "SMTP configuration and default email template saved successfully!",
      });
      onSaved?.();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save SMTP configuration",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setStatusMessage(null);
    try {
      const res = await verifySmtp({
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
        text: err instanceof Error ? err.message : "SMTP test failed",
      });
    } finally {
      setTesting(false);
    }
  }

  // Live sample preview calculation
  const sampleData: Record<string, string> = {
    holder_name: "Ananya Sharma",
    certification_title: "Advanced Data Analytics Programme",
    certificate_number: "WE-2026-000456",
    issue_date: "2026-03-14",
    grade: "Distinction",
    verification_url: "https://certify.weskill.org/?id=WE-2026-000456",
    issuing_authority: fromName || "Weskill Certification Authority",
  };

  const previewSubject = replacePlaceholders(defaultSubject, sampleData);
  const previewBody = replacePlaceholders(defaultBody, sampleData);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-gold/15 text-gold">
              <Server className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold font-display">
                SMTP &amp; Email Dispatch Settings
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Configure your outgoing mail server, sender identity, and default certificate email
                template.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

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
              <Info className="size-4 shrink-0 mt-0.5" />
            )}
            <div>{statusMessage.text}</div>
          </div>
        )}

        {loading ? (
          <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-gold" /> Loading SMTP configuration…
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <Tabs defaultValue="template" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="template" className="text-xs sm:text-sm">
                  <Mail className="size-3.5 mr-1.5" />
                  Default Email
                </TabsTrigger>
                <TabsTrigger value="server" className="text-xs sm:text-sm">
                  <Server className="size-3.5 mr-1.5" />
                  Server &amp; Auth
                </TabsTrigger>
                <TabsTrigger value="test" className="text-xs sm:text-sm">
                  <Send className="size-3.5 mr-1.5" />
                  Test Delivery
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: DEFAULT EMAIL TEMPLATE (Primary User Requirement) */}
              <TabsContent value="template" className="space-y-5 pt-4">
                <div className="rounded-xl border border-border/80 bg-surface/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Sparkles className="size-3.5 text-gold" />
                      Dynamic Placeholders
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Click to insert into {lastFocusedField}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {TEMPLATE_VARIABLES.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() => handleInsertVariable(v.key)}
                        className="inline-flex items-center gap-1 rounded-lg border border-border/70 bg-card px-2.5 py-1 text-xs font-mono text-foreground hover:border-gold hover:bg-gold/10 transition-colors"
                        title={`Insert ${v.label} (sample: ${v.sample})`}
                      >
                        <span>{v.key}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultSubject" className="text-xs font-semibold">
                    Default Mailing Subject Line
                  </Label>
                  <Input
                    id="defaultSubject"
                    required
                    value={defaultSubject}
                    onFocus={() => setLastFocusedField("subject")}
                    onChange={(e) => setDefaultSubject(e.target.value)}
                    placeholder="Your {{certification_title}} Certificate is Ready - {{certificate_number}}"
                    className="h-10 text-sm font-medium"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This subject line will be pre-filled when you send a newly created certificate.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="defaultBody" className="text-xs font-semibold">
                    Default Mailing Body (Plain Text &amp; Styled HTML)
                  </Label>
                  <Textarea
                    id="defaultBody"
                    required
                    rows={8}
                    value={defaultBody}
                    onFocus={() => setLastFocusedField("body")}
                    onChange={(e) => setDefaultBody(e.target.value)}
                    placeholder="Dear {{holder_name}},&#10;&#10;Congratulations on earning your certificate for {{certification_title}}!..."
                    className="font-mono text-xs leading-relaxed"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Supports line breaks and dynamic variables. The system wraps this in an official
                    branded Weskill email template with credential details and a direct verification
                    button.
                  </p>
                </div>

                {/* Live Preview Box */}
                <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Live Sample Preview
                  </span>
                  <div className="rounded-xl border border-border/60 bg-surface/30 p-3.5 space-y-2 text-xs">
                    <div>
                      <span className="font-semibold text-muted-foreground">Subject: </span>
                      <span className="font-medium text-foreground">{previewSubject}</span>
                    </div>
                    <div className="border-t border-border/50 pt-2 font-mono whitespace-pre-wrap text-foreground/90 text-[11px] leading-relaxed">
                      {previewBody}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: SERVER & CREDENTIALS */}
              <TabsContent value="server" className="space-y-4 pt-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="host" className="text-xs font-semibold">
                      SMTP Host
                    </Label>
                    <Input
                      id="host"
                      required
                      value={host}
                      onChange={(e) => setHost(e.target.value)}
                      placeholder="e.g. smtp.gmail.com or smtp.sendgrid.net"
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="port" className="text-xs font-semibold">
                      Port
                    </Label>
                    <Input
                      id="port"
                      type="number"
                      required
                      value={port}
                      onChange={(e) => setPort(Number(e.target.value))}
                      placeholder="587"
                      className="h-10 text-sm font-mono"
                    />
                    <span className="text-[11px] text-muted-foreground">
                      Typically 587 (TLS) or 465 (SSL).
                    </span>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-end pb-1">
                    <div className="flex items-center justify-between rounded-xl border border-border p-3">
                      <div className="space-y-0.5">
                        <Label htmlFor="secure-mode" className="text-xs font-semibold">
                          SSL / Direct TLS
                        </Label>
                        <p className="text-[11px] text-muted-foreground">
                          {secure ? "Enabled (Port 465)" : "Disabled (Port 587 STARTTLS)"}
                        </p>
                      </div>
                      <Switch id="secure-mode" checked={secure} onCheckedChange={setSecure} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="userName" className="text-xs font-semibold">
                      SMTP Username / Email
                    </Label>
                    <Input
                      id="userName"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="apikey or your-email@domain.com"
                      className="h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="text-xs font-semibold">
                        SMTP Password / API Key
                      </Label>
                      {hasStoredPassword && (
                        <span className="text-[10px] text-emerald font-semibold bg-emerald/10 border border-emerald/30 rounded-full px-2 py-0.5">
                          Password configured
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          hasStoredPassword ? "Leave blank to keep current" : "Enter SMTP password"
                        }
                        className="h-10 text-sm pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {hasStoredPassword && (
                      <span className="text-[11px] text-muted-foreground">
                        Only fill this if you want to update the existing password.
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fromEmail" className="text-xs font-semibold">
                      From Email Address
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
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="fromName" className="text-xs font-semibold">
                      Sender Name
                    </Label>
                    <Input
                      id="fromName"
                      required
                      value={fromName}
                      onChange={(e) => setFromName(e.target.value)}
                      placeholder="WeCertify by Weskill"
                      className="h-10 text-sm"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: TEST DELIVERY */}
              <TabsContent value="test" className="space-y-4 pt-4">
                <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      Verify SMTP Connection
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Save your settings first, then dispatch a real test email to confirm that your
                      SMTP host accepts connections and delivers emails properly.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="testEmail" className="text-xs font-semibold">
                      Recipient Email for Test Message
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="testEmail"
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="your-admin-email@example.com"
                        className="h-10 text-sm"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => void handleTest()}
                        disabled={testing || !host}
                        className="h-10 shrink-0 gap-1.5"
                      >
                        {testing ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Send className="size-4" />
                        )}
                        Send Test
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-end gap-3 border-t border-border/80 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-gold hover:bg-gold-dark text-gold-foreground font-semibold px-6 shadow-gold gap-2"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                Save Settings
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
