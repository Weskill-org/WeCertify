import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  Eye,
  Loader2,
  Maximize2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TemplateSelector } from "@/components/certifyhub/TemplateSelector";
import { TemplatePreview } from "@/components/certifyhub/TemplatePreview";
import { SendCertificateDialog } from "@/components/certifyhub/SendCertificateDialog";
import { EmailSettingsDialog } from "@/components/certifyhub/EmailSettingsDialog";
import { renderTemplate } from "@/lib/template";
import {
  createCertificate,
  generateUniqueCertificateNumber,
  getStaffAccess,
  listCertificates,
  listTemplates,
  type ManagedCertificate,
} from "@/lib/admin.functions";
import {
  DEFAULT_CERTIFICATE_PREFIX,
  generateTimeBasedCertificateNumber,
  getYearFromIssueDate,
  isValidCertificateFormat,
} from "@/lib/certificate-number";

export const Route = createFileRoute("/_authenticated/dashboard/issue")({
  head: () => ({
    meta: [
      { title: "Issue Certificate Studio — WeCertify" },
      {
        name: "description",
        content: "Issue official Weskill verifiable certificates with live preview.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: IssueCertificatePage,
});

const getInitialForm = () => ({
  certificateNumber: "",
  holderName: "",
  recipientEmail: "",
  certificationTitle: "",
  issueDate: new Date().toISOString().slice(0, 10),
  expiryDate: "",
  grade: "",
  templateId: "",
});

function IssueCertificatePage() {
  const queryClient = useQueryClient();
  const fetchAccess = useServerFn(getStaffAccess);
  const fetchCertificates = useServerFn(listCertificates);
  const addCertificate = useServerFn(createCertificate);
  const fetchTemplates = useServerFn(listTemplates);
  const generateServerNumber = useServerFn(generateUniqueCertificateNumber);

  const access = useQuery({ queryKey: ["staff-access"], queryFn: () => fetchAccess({}) });
  const certificates = useQuery({
    queryKey: ["managed-certificates"],
    queryFn: () => fetchCertificates({}),
  });
  const templates = useQuery({
    queryKey: ["certificate-templates"],
    queryFn: () => fetchTemplates({}),
  });

  const [form, setForm] = useState(getInitialForm);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [enlargePreview, setEnlargePreview] = useState(false);
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false);
  const [numberManuallyEdited, setNumberManuallyEdited] = useState(false);

  // Email dispatch modal states
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedCertForEmail, setSelectedCertForEmail] = useState<ManagedCertificate | null>(null);
  const [isPostCreation, setIsPostCreation] = useState(false);

  const canIssue = Boolean(access.data?.isAdmin || access.data?.isIssuer);
  const isAdmin = Boolean(access.data?.isAdmin);

  const templateList = useMemo(() => templates.data ?? [], [templates.data]);

  const selectedTemplate = useMemo(() => {
    if (form.templateId === "none") return undefined;
    if (form.templateId) {
      return templateList.find((t) => t.id === form.templateId);
    }
    const activeList = templateList.filter((t) => !t.is_archived);
    return activeList.find((t) => t.is_default) ?? activeList[0] ?? templateList[0];
  }, [templateList, form.templateId]);

  // Set default variables once a template is selected if empty
  useEffect(() => {
    if (selectedTemplate && Object.keys(variableValues).length === 0) {
      const defaults: Record<string, string> = {};
      for (const variable of selectedTemplate.variables) {
        defaults[variable.key] = variable.defaultValue ?? "";
      }
      setVariableValues(defaults);
    }
  }, [selectedTemplate, variableValues]);

  const handleGenerateNumber = useCallback(
    async (targetYear?: number) => {
      setIsGeneratingNumber(true);
      const year = targetYear ?? getYearFromIssueDate(form.issueDate);
      try {
        const generated = await generateServerNumber({
          data: { year, prefix: DEFAULT_CERTIFICATE_PREFIX },
        });
        setForm((prev) => ({ ...prev, certificateNumber: generated }));
        setNumberManuallyEdited(false);
      } catch {
        // Fallback to local calculation using certificates query cache
        const existing = (certificates.data ?? []).map((c) => c.certificate_number);
        const fallback = generateTimeBasedCertificateNumber(
          existing,
          year,
          DEFAULT_CERTIFICATE_PREFIX,
        );
        setForm((prev) => ({ ...prev, certificateNumber: fallback }));
      } finally {
        setIsGeneratingNumber(false);
      }
    },
    [form.issueDate, certificates.data, generateServerNumber],
  );

  // Auto-generate initial certificate number when issuing access is confirmed
  useEffect(() => {
    if (!form.certificateNumber && canIssue && !isGeneratingNumber) {
      void handleGenerateNumber();
    }
  }, [form.certificateNumber, canIssue, handleGenerateNumber, isGeneratingNumber]);

  const handleIssueDateChange = (newDate: string) => {
    const oldYear = getYearFromIssueDate(form.issueDate);
    const newYear = getYearFromIssueDate(newDate);

    setForm((prev) => ({ ...prev, issueDate: newDate }));

    // If user hasn't manually edited the number, keep year in sync
    if (!numberManuallyEdited && oldYear !== newYear) {
      void handleGenerateNumber(newYear);
    }
  };

  const isDuplicateNumber = useMemo(() => {
    if (!form.certificateNumber.trim()) return false;
    const current = form.certificateNumber.trim().toUpperCase();
    return (certificates.data ?? []).some(
      (c) => c.certificate_number.trim().toUpperCase() === current,
    );
  }, [form.certificateNumber, certificates.data]);

  const isStandardFormat = useMemo(() => {
    return isValidCertificateFormat(form.certificateNumber);
  }, [form.certificateNumber]);

  const issuePreview = useMemo(() => {
    if (!selectedTemplate) return null;
    return renderTemplate(selectedTemplate.html, {
      certificate_number: form.certificateNumber || "WE-2026-000456",
      holder_name: form.holderName || "Ananya Sharma",
      certification_title: form.certificationTitle || "Advanced Data Analytics Programme",
      issue_date: form.issueDate || "2026-03-14",
      expiry_date: form.expiryDate,
      grade: form.grade,
      issuing_authority: "Weskill Certification Authority",
      status: "active",
      ...variableValues,
    });
  }, [selectedTemplate, form, variableValues]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [message]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const createdCert = await addCertificate({
        data: {
          certificateNumber: form.certificateNumber,
          holderName: form.holderName,
          recipientEmail: form.recipientEmail,
          certificationTitle: form.certificationTitle,
          issueDate: form.issueDate,
          expiryDate: form.expiryDate,
          grade: form.grade,
          status: "active" as const,
          templateId: selectedTemplate?.id ?? "",
          templateData: variableValues,
        },
      });
      setForm(getInitialForm());
      setVariableValues({});
      setNumberManuallyEdited(false);
      setMessage({
        kind: "ok",
        text: "Certificate issued and registered successfully in directory!",
      });
      await queryClient.invalidateQueries({ queryKey: ["managed-certificates"] });
      void handleGenerateNumber();

      // Trigger Step 2: Next step would be to send it!
      setSelectedCertForEmail(createdCert);
      setIsPostCreation(true);
      setSendDialogOpen(true);
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not issue that certificate.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (access.isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-sm text-muted-foreground gap-3">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span>Verifying issuing credentials…</span>
      </div>
    );
  }

  if (!canIssue) {
    return (
      <div className="max-w-2xl mx-auto my-12 rounded-3xl border border-border bg-card p-8 text-center shadow-soft">
        <div className="size-12 rounded-full bg-gold/10 text-gold flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="size-6" />
        </div>
        <h2 className="font-display text-xl font-bold text-foreground">Issuance Access Required</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account is currently in Read-Only mode. To issue certificates in the WeCertify
          directory, please ask a Weskill administrator to grant your account Issuer privileges.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/dashboard">
            <Button variant="outline">Back to Overview</Button>
          </Link>
          <Link to="/dashboard/certificates">
            <Button>Browse Registry</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-rise">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            <Link to="/dashboard" className="hover:text-foreground flex items-center gap-0.5">
              <ChevronLeft className="size-3" /> Dashboard
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">Issue Certificate</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Certificate Issuance Studio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Select a template, fill recipient and credential details, and preview in real time
            before registry registration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/dashboard/templates">
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <span>Manage Templates</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Notification status banner */}
      {message && (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-sm font-medium flex items-center gap-2 ${
            message.kind === "ok"
              ? "border-emerald/40 bg-emerald/10 text-emerald"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {message.kind === "ok" ? (
            <CheckCircle2 className="size-4 shrink-0" />
          ) : (
            <AlertCircle className="size-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Main Studio Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: Form Controls */}
        <div className="lg:col-span-7">
          <section className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-lift">
            <div className="flex items-center justify-between pb-4 border-b border-border/60 mb-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                <ShieldCheck className="size-4 text-emerald" />
                Credential Details
              </div>
              <span className="text-xs text-muted-foreground">
                Assigned Authority: <strong>Weskill</strong>
              </span>
            </div>

            <form className="grid gap-6 sm:grid-cols-2" onSubmit={handleCreate}>
              {/* Template Selector Card Grid */}
              <div className="sm:col-span-2">
                <TemplateSelector
                  templates={templateList}
                  selectedId={
                    form.templateId === "none"
                      ? ""
                      : form.templateId || (selectedTemplate?.id ?? "")
                  }
                  onSelect={(id) => {
                    const nextId = id === "" ? "none" : id;
                    const next = templateList.find((t) => t.id === id);
                    setForm({ ...form, templateId: nextId });
                    const defaults: Record<string, string> = {};
                    for (const variable of next?.variables ?? []) {
                      defaults[variable.key] =
                        variableValues[variable.key] || variable.defaultValue || "";
                    }
                    setVariableValues(defaults);
                  }}
                  onAddNew={() => {
                    // Navigate to templates page
                    window.location.href = "/dashboard/templates";
                  }}
                  sampleData={{
                    certificate_number: form.certificateNumber || "WE-2026-000456",
                    holder_name: form.holderName || "Ananya Sharma",
                    certification_title:
                      form.certificationTitle || "Advanced Data Analytics Programme",
                    issue_date: form.issueDate || "2026-03-14",
                    expiry_date: form.expiryDate,
                    grade: form.grade,
                    issuing_authority: "Weskill Certification Authority",
                    status: "active",
                    ...variableValues,
                  }}
                />
              </div>

              {/* Certificate Number Input with Auto-generation */}
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="certificateNumber"
                    className="font-medium text-xs uppercase tracking-wider text-muted-foreground"
                  >
                    Certificate Number
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleGenerateNumber()}
                    disabled={isGeneratingNumber}
                    className="h-7 gap-1.5 px-2 text-xs font-medium text-primary hover:bg-primary/10 hover:text-primary transition-colors"
                    title="Autogenerate unique time-based certificate number"
                  >
                    {isGeneratingNumber ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="size-3.5" />
                    )}
                    <span>{isGeneratingNumber ? "Generating…" : "Auto-generate"}</span>
                  </Button>
                </div>

                <div className="relative">
                  <Input
                    id="certificateNumber"
                    required
                    value={form.certificateNumber}
                    onChange={(e) => {
                      setNumberManuallyEdited(true);
                      setForm({ ...form, certificateNumber: e.target.value.toUpperCase() });
                    }}
                    placeholder="WE-2026-Y38AE4TC"
                    className={`h-11 font-mono uppercase pr-24 ${
                      isDuplicateNumber
                        ? "border-destructive focus-visible:ring-destructive"
                        : isStandardFormat
                          ? "border-emerald/50"
                          : ""
                    }`}
                  />
                  <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => void handleGenerateNumber()}
                      disabled={isGeneratingNumber}
                      className="h-8 gap-1 text-xs px-2.5 bg-secondary/80 hover:bg-secondary font-medium"
                      title="Generate new unique certificate number"
                    >
                      {isGeneratingNumber ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <RefreshCw className="size-3" />
                      )}
                      <span>New</span>
                    </Button>
                  </div>
                </div>

                {/* Status & helper badges */}
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  {isDuplicateNumber ? (
                    <span className="flex items-center gap-1 text-destructive font-medium">
                      <AlertCircle className="size-3" /> That certificate number already exists in
                      registry
                    </span>
                  ) : isStandardFormat ? (
                    <span className="flex items-center gap-1 text-emerald font-medium">
                      <Check className="size-3" /> Unique verified time-based format
                    </span>
                  ) : form.certificateNumber ? (
                    <span className="text-muted-foreground">
                      Standard format:{" "}
                      <code className="font-mono font-semibold">WE-YYYY-[CODE]</code>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Will be automatically generated if blank
                    </span>
                  )}
                  <span className="text-muted-foreground font-mono text-[10px]">
                    Format: WE-[Year]-[Code]
                  </span>
                </div>
              </div>

              {/* Holder Name */}
              <div className="space-y-2">
                <Label htmlFor="holderName">Holder Full Name</Label>
                <Input
                  id="holderName"
                  required
                  value={form.holderName}
                  onChange={(e) => setForm({ ...form, holderName: e.target.value })}
                  placeholder="Ananya Sharma"
                  className="h-11"
                />
              </div>

              {/* Recipient Email */}
              <div className="space-y-2">
                <Label htmlFor="recipientEmail">Recipient Email (Optional)</Label>
                <Input
                  id="recipientEmail"
                  type="email"
                  value={form.recipientEmail}
                  onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })}
                  placeholder="ananya.sharma@example.com"
                  className="h-11"
                />
              </div>

              {/* Programme / Title */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="certificationTitle">Certification Programme Title</Label>
                <Input
                  id="certificationTitle"
                  required
                  value={form.certificationTitle}
                  onChange={(e) => setForm({ ...form, certificationTitle: e.target.value })}
                  placeholder="Advanced Data Analytics Programme"
                  className="h-11"
                />
              </div>

              {/* Issue Date */}
              <div className="space-y-2">
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  required
                  value={form.issueDate}
                  onChange={(e) => handleIssueDateChange(e.target.value)}
                  className="h-11"
                />
              </div>

              {/* Expiry Date */}
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="h-11"
                />
              </div>

              {/* Grade */}
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="grade">Grade / Honors Standing (Optional)</Label>
                <Input
                  id="grade"
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  placeholder="Distinction / First Class Honors"
                  className="h-11"
                />
              </div>

              {/* Dynamic Template Custom Variables */}
              {selectedTemplate &&
                selectedTemplate.variables &&
                selectedTemplate.variables.length > 0 && (
                  <div className="sm:col-span-2 rounded-2xl border border-emerald/30 bg-emerald/5 p-4 sm:p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-emerald">
                        Custom Fields: {selectedTemplate.name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {selectedTemplate.variables.length} custom field
                        {selectedTemplate.variables.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {selectedTemplate.variables.map((variable) => (
                        <div className="space-y-1.5" key={variable.key}>
                          <Label htmlFor={`var-${variable.key}`} className="text-xs font-medium">
                            {variable.label}
                          </Label>
                          <Input
                            id={`var-${variable.key}`}
                            value={variableValues[variable.key] ?? ""}
                            onChange={(e) =>
                              setVariableValues({
                                ...variableValues,
                                [variable.key]: e.target.value,
                              })
                            }
                            placeholder={variable.defaultValue || variable.key}
                            className="h-10 text-sm bg-background"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Submit Button */}
              <div className="sm:col-span-2 pt-2">
                <Button
                  type="submit"
                  size="lg"
                  className="h-12 w-full text-base font-medium shadow-gold"
                  disabled={saving}
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4 text-gold" />
                  )}
                  <span>Issue & Register Certificate</span>
                </Button>
                <p className="text-[11px] text-muted-foreground text-center mt-2">
                  Once registered, this certificate will immediately be live in the directory with
                  public verification.
                </p>
              </div>
            </form>
          </section>
        </div>

        {/* Right 5 Columns: Sticky Live Certificate Preview */}
        <div className="lg:col-span-5 sticky top-20 space-y-3">
          <div className="rounded-3xl border border-border/80 bg-card p-5 shadow-lift space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Eye className="size-3.5 text-primary" />
                Live Certificate Preview
              </div>
              {issuePreview && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setEnlargePreview(true)}
                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Maximize2 className="size-3" /> Enlarge
                </Button>
              )}
            </div>

            {issuePreview ? (
              <div className="rounded-2xl border border-border/80 bg-white overflow-hidden shadow-soft">
                <TemplatePreview
                  html={issuePreview}
                  title="Live Certificate Preview"
                  className="h-[430px] w-full"
                />
              </div>
            ) : (
              <div className="h-[380px] rounded-2xl border border-dashed border-border bg-surface/40 flex flex-col items-center justify-center p-6 text-center text-muted-foreground">
                <Sparkles className="size-8 opacity-40 mb-2" />
                <p className="text-sm font-medium">No preview available</p>
                <p className="text-xs max-w-xs mt-1">
                  Please select an active template to view the real-time preview.
                </p>
              </div>
            )}

            <div className="rounded-xl bg-surface p-3 text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between font-medium text-foreground">
                <span>Active Template:</span>
                <span className="text-primary">{selectedTemplate?.name ?? "Default"}</span>
              </div>
              <p className="text-[11px]">
                Preview updates instantly as you type. Upon issuance, the recipient can receive the
                high-res generated PDF certificate directly via email.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enlarge Preview Dialog Modal */}
      <Dialog open={enlargePreview} onOpenChange={setEnlargePreview}>
        <DialogContent className="max-w-5xl p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-display">
              Certificate Preview: {selectedTemplate?.name}
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              High-resolution certificate preview rendering with your currently entered issuance
              details.
            </p>
          </DialogHeader>
          {issuePreview && (
            <div className="mt-4">
              <TemplatePreview
                html={issuePreview}
                title="Fullscreen certificate preview"
                className="h-[540px] w-full rounded-xl border border-border bg-white shadow-soft"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Send Certificate Dialog (Triggered post-issuance) */}
      <SendCertificateDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        certificate={selectedCertForEmail}
        isPostCreation={isPostCreation}
        isAdmin={isAdmin}
        onOpenEmailSettings={() => setEmailDialogOpen(true)}
        onEmailSent={() => {
          void queryClient.invalidateQueries({ queryKey: ["managed-certificates"] });
        }}
      />

      {/* Email settings dialog */}
      <EmailSettingsDialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen} />
    </div>
  );
}
