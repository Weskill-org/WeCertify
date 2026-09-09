import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Loader2,
  LogOut,
  Mail,
  Maximize2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BrandLockup } from "@/components/certifyhub/Brand";
import { TemplateManager, type TemplateDraft } from "@/components/certifyhub/TemplateManager";
import { TemplatePreview } from "@/components/certifyhub/TemplatePreview";
import { TemplateSelector } from "@/components/certifyhub/TemplateSelector";
import { SmtpSettingsDialog } from "@/components/certifyhub/SmtpSettingsDialog";
import { SendCertificateDialog } from "@/components/certifyhub/SendCertificateDialog";
import { IssuerManagerDialog } from "@/components/certifyhub/IssuerManagerDialog";
import { renderTemplate } from "@/lib/template";
import { supabase } from "@/integrations/supabase/client";
import {
  archiveTemplate,
  createCertificate,
  deleteTemplate,
  duplicateTemplate,
  generateUniqueCertificateNumber,
  getStaffAccess,
  listCertificates,
  listTemplates,
  saveTemplate,
  setCertificateStatus,
  setDefaultTemplate,
  unarchiveTemplate,
  type ManagedCertificate,
} from "@/lib/admin.functions";
import {
  DEFAULT_CERTIFICATE_PREFIX,
  generateTimeBasedCertificateNumber,
  getYearFromIssueDate,
  isValidCertificateFormat,
} from "@/lib/certificate-number";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Issuing dashboard — WeCertify by Weskill" },
      {
        name: "description",
        content: "Issue and manage Weskill certificates in the WeCertify registry.",
      },
      { property: "og:title", content: "Issuing dashboard — WeCertify by Weskill" },
      {
        property: "og:description",
        content: "Issue and manage Weskill certificates in the WeCertify registry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
  errorComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">
      Something went wrong loading the registry. Please refresh the page.
    </div>
  ),
  notFoundComponent: () => (
    <div className="p-10 text-center text-sm text-muted-foreground">Page not found.</div>
  ),
});

const STATUS_STYLES: Record<string, string> = {
  active: "border-emerald/40 bg-emerald/10 text-emerald",
  expired: "border-gold/40 bg-gold/10 text-gold",
  revoked: "border-destructive/40 bg-destructive/10 text-destructive",
};

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

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccess = useServerFn(getStaffAccess);
  const fetchCertificates = useServerFn(listCertificates);
  const addCertificate = useServerFn(createCertificate);
  const changeStatus = useServerFn(setCertificateStatus);
  const fetchTemplates = useServerFn(listTemplates);
  const storeTemplate = useServerFn(saveTemplate);
  const removeTemplate = useServerFn(deleteTemplate);
  const copyTemplate = useServerFn(duplicateTemplate);
  const makeDefaultTemplate = useServerFn(setDefaultTemplate);
  const archiveTpl = useServerFn(archiveTemplate);
  const unarchiveTpl = useServerFn(unarchiveTemplate);
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

  // SMTP & Certificate Email dialog states
  const [smtpDialogOpen, setSmtpDialogOpen] = useState(false);
  const [issuersDialogOpen, setIssuersDialogOpen] = useState(false);
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
        // Fallback to calculation using certificates query cache
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

  const handleSignOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }, [navigate, queryClient]);

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
      setMessage({ kind: "ok", text: "Certificate issued and registered in directory." });
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

  async function handleSaveTemplate(draft: TemplateDraft) {
    setMessage(null);
    try {
      await storeTemplate({ data: draft });
      setMessage({ kind: "ok", text: "Template saved." });
      await queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not save that template.",
      });
      throw error;
    }
  }

  async function handleDeleteTemplate(id: string) {
    try {
      await removeTemplate({ data: { id } });
      setMessage({ kind: "ok", text: "Template deleted." });
      await queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not delete that template.",
      });
    }
  }

  async function handleDuplicateTemplate(id: string) {
    try {
      await copyTemplate({ data: { id } });
      setMessage({ kind: "ok", text: "Template duplicated successfully." });
      await queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not duplicate template.",
      });
    }
  }

  async function handleSetDefaultTemplate(id: string) {
    try {
      await makeDefaultTemplate({ data: { id } });
      setMessage({ kind: "ok", text: "Default template updated." });
      await queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not set default template.",
      });
    }
  }

  async function handleArchiveTemplate(id: string) {
    try {
      await archiveTpl({ data: { id } });
      setMessage({ kind: "ok", text: "Template archived." });
      await queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not archive template.",
      });
    }
  }

  async function handleUnarchiveTemplate(id: string) {
    try {
      await unarchiveTpl({ data: { id } });
      setMessage({ kind: "ok", text: "Template restored to active." });
      await queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not restore template.",
      });
    }
  }

  async function handleStatus(id: string, status: "active" | "revoked") {
    try {
      await changeStatus({ data: { id, status } });
      await queryClient.invalidateQueries({ queryKey: ["managed-certificates"] });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not update that certificate.",
      });
    }
  }

  const rows = useMemo(() => certificates.data ?? [], [certificates.data]);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-hero-gradient">
        <nav
          className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5"
          aria-label="Dashboard"
        >
          <Link to="/">
            <BrandLockup onDark />
          </Link>
          <div className="flex items-center gap-3 text-sm text-primary-foreground/80">
            <span className="hidden sm:inline">{access.data?.email}</span>
            <span className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-gold">
              {isAdmin ? "Administrator" : canIssue ? "Issuer" : "No issuing access"}
            </span>
            {isAdmin && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIssuersDialogOpen(true)}
                  className="gap-1.5 border-emerald/40 bg-emerald/10 text-emerald hover:bg-emerald/25 hover:text-emerald shadow-sm"
                >
                  <Users className="size-3.5" />
                  Manage Issuers
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSmtpDialogOpen(true)}
                  className="gap-1.5 border-gold/40 bg-gold/10 text-gold hover:bg-gold/25 hover:text-gold shadow-sm"
                >
                  <Mail className="size-3.5" />
                  SMTP Settings
                </Button>
              </>
            )}
            <Button variant="secondary" size="sm" onClick={() => void handleSignOut()}>
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </nav>
        <div className="mx-auto max-w-6xl px-6 pb-12">
          <h1 className="font-display text-3xl font-semibold text-primary-foreground sm:text-4xl">
            Issuing dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-primary-foreground/70">
            Add credentials to the live Weskill registry. Choose from multiple certificate templates
            and issue credentials that are instantly verifiable by anyone.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-10">
        {message && (
          <p
            role="status"
            className={`rounded-xl border px-4 py-3 text-sm font-medium ${
              message.kind === "ok"
                ? "border-emerald/40 bg-emerald/10 text-emerald"
                : "border-destructive/40 bg-destructive/10 text-destructive"
            }`}
          >
            {message.text}
          </p>
        )}

        {access.isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading your access…
          </div>
        ) : !canIssue ? (
          <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Your account is signed in but has no issuing permissions yet. Ask a Weskill
            administrator to grant you issuer access.
          </p>
        ) : (
          <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-lift sm:p-8">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald" />
              Issue a certificate
            </div>

            <form className="mt-6 grid gap-6 sm:grid-cols-2" onSubmit={handleCreate}>
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
                    const el = document.getElementById("template-manager-section");
                    el?.scrollIntoView({ behavior: "smooth" });
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

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="certificateNumber">Certificate number</Label>
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
                      <AlertCircle className="size-3" /> That certificate number already exists in registry
                    </span>
                  ) : isStandardFormat ? (
                    <span className="flex items-center gap-1 text-emerald font-medium">
                      <Check className="size-3" /> Unique & verified format (Time-based Alphanumeric)
                    </span>
                  ) : form.certificateNumber ? (
                    <span className="text-muted-foreground">
                      Standard format: <code className="font-mono font-semibold">WE-YYYY-[CODE]</code>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      Will be automatically assigned if left blank
                    </span>
                  )}
                  <span className="text-muted-foreground font-mono">Format: WE-[Year]-[Alphanumeric Time]</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="holderName">Holder name</Label>
                <Input
                  id="holderName"
                  required
                  value={form.holderName}
                  onChange={(e) => setForm({ ...form, holderName: e.target.value })}
                  placeholder="Ananya Sharma"
                  className="h-11"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="recipientEmail">Recipient email (optional)</Label>
                  <span className="text-xs text-muted-foreground">
                    Pre-populates next-step email dispatch
                  </span>
                </div>
                <Input
                  id="recipientEmail"
                  type="email"
                  value={form.recipientEmail}
                  onChange={(e) => setForm({ ...form, recipientEmail: e.target.value })}
                  placeholder="ananya.sharma@example.com"
                  className="h-11"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="certificationTitle">Certification title</Label>
                <Input
                  id="certificationTitle"
                  required
                  value={form.certificationTitle}
                  onChange={(e) => setForm({ ...form, certificationTitle: e.target.value })}
                  placeholder="Advanced Data Analytics Programme"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="issueDate">Issue date</Label>
                <Input
                  id="issueDate"
                  type="date"
                  required
                  value={form.issueDate}
                  onChange={(e) => handleIssueDateChange(e.target.value)}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry date (optional)</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={form.expiryDate}
                  onChange={(e) => setForm({ ...form, expiryDate: e.target.value })}
                  className="h-11"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="grade">Grade / Standing (optional)</Label>
                <Input
                  id="grade"
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  placeholder="Distinction"
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
                        Custom Template Fields: {selectedTemplate.name}
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

              {/* Live Preview & Fullscreen Option */}
              {issuePreview && (
                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      Live Certificate Preview ({selectedTemplate?.name ?? "Custom"})
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEnlargePreview(true)}
                      className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Maximize2 className="size-3.5" /> Enlarge Preview
                    </Button>
                  </div>
                  <TemplatePreview
                    html={issuePreview}
                    title="Certificate template preview"
                    className="h-[440px] w-full rounded-2xl border border-border bg-white shadow-soft"
                  />
                </div>
              )}

              <div className="sm:col-span-2">
                <Button type="submit" size="lg" className="h-11 w-full" disabled={saving}>
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Plus className="size-4" />
                  )}
                  Issue certificate
                </Button>
              </div>
            </form>
          </section>
        )}

        {/* Template Manager */}
        {canIssue && (
          <div id="template-manager-section">
            <TemplateManager
              templates={templateList}
              isLoading={templates.isLoading}
              canEdit={canIssue}
              canDelete={isAdmin}
              onSave={handleSaveTemplate}
              onDelete={handleDeleteTemplate}
              onDuplicate={handleDuplicateTemplate}
              onSetDefault={handleSetDefaultTemplate}
              onArchive={handleArchiveTemplate}
              onUnarchive={handleUnarchiveTemplate}
            />
          </div>
        )}

        {/* Registry Table */}
        <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-lift sm:p-8">
          <h2 className="font-display text-xl font-semibold text-foreground">Registry</h2>
          {certificates.isLoading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Loading certificates…
            </div>
          ) : rows.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">No certificates yet.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                    <th className="py-3 pr-4 font-semibold">Number</th>
                    <th className="py-3 pr-4 font-semibold">Holder</th>
                    <th className="py-3 pr-4 font-semibold">Programme</th>
                    <th className="py-3 pr-4 font-semibold">Issued</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    <th className="py-3 pr-4 font-semibold">Email Delivery</th>
                    <th className="py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-0">
                      <td className="py-3 pr-4 font-mono text-xs">{row.certificate_number}</td>
                      <td className="py-3 pr-4">{row.holder_name}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{row.certification_title}</td>
                      <td className="py-3 pr-4 text-muted-foreground">{row.issue_date}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${
                            STATUS_STYLES[row.status] ?? "border-border bg-surface"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {row.email_sent_at ? (
                          <div className="flex flex-col gap-0.5">
                            <span
                              className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald/40 bg-emerald/10 px-2.5 py-0.5 text-xs font-medium text-emerald"
                              title={`Sent at: ${new Date(row.email_sent_at).toLocaleString()}`}
                            >
                              <CheckCircle2 className="size-3" /> Emailed
                            </span>
                            {row.recipient_email && (
                              <span className="text-[11px] text-muted-foreground truncate max-w-[140px]">
                                {row.recipient_email}
                              </span>
                            )}
                          </div>
                        ) : row.recipient_email ? (
                          <span
                            className="text-xs text-muted-foreground truncate max-w-[140px] block"
                            title={row.recipient_email}
                          >
                            {row.recipient_email}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/60 italic">Not sent</span>
                        )}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedCertForEmail(row);
                              setIsPostCreation(false);
                              setSendDialogOpen(true);
                            }}
                            className="h-8 gap-1.5 text-xs border-gold/30 text-gold hover:bg-gold/10 hover:text-gold"
                            title="Send certificate to recipient via email"
                          >
                            <Mail className="size-3.5" />
                            {row.email_sent_at ? "Resend" : "Send"}
                          </Button>
                          {isAdmin &&
                            (row.status === "revoked" ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleStatus(row.id, "active")}
                                className="h-8 text-xs"
                              >
                                Reinstate
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleStatus(row.id, "revoked")}
                                className="h-8 text-xs"
                              >
                                Revoke
                              </Button>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* Enlarge Preview Dialog */}
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
                className="h-[540px] w-full rounded-xl border border-border bg-white"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Admin SMTP Settings Dialog */}
      <SmtpSettingsDialog
        open={smtpDialogOpen}
        onOpenChange={setSmtpDialogOpen}
        onSaved={() => {
          setMessage({ kind: "ok", text: "SMTP configuration updated successfully." });
        }}
      />

      {/* Admin Issuer Accounts Dialog */}
      <IssuerManagerDialog
        open={issuersDialogOpen}
        onOpenChange={setIssuersDialogOpen}
        currentUserEmail={access.data?.email}
      />

      {/* Send Certificate Dialog (Triggered post-issuance or from registry row) */}
      <SendCertificateDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        certificate={selectedCertForEmail}
        isPostCreation={isPostCreation}
        isAdmin={isAdmin}
        onOpenSmtpSettings={() => setSmtpDialogOpen(true)}
        onEmailSent={() => {
          void queryClient.invalidateQueries({ queryKey: ["managed-certificates"] });
        }}
      />
    </div>
  );
}
