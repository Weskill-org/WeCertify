import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, Plus, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLockup } from "@/components/certifyhub/Brand";
import { TemplateManager } from "@/components/certifyhub/TemplateManager";
import { TemplatePreview } from "@/components/certifyhub/TemplatePreview";
import { renderTemplate } from "@/lib/template";
import { supabase } from "@/integrations/supabase/client";
import {
  createCertificate,
  deleteTemplate,
  getStaffAccess,
  listCertificates,
  listTemplates,
  saveTemplate,
  setCertificateStatus,
} from "@/lib/admin.functions";


export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Issuing dashboard — CertifyHub by Weskill" },
      {
        name: "description",
        content: "Issue and manage Weskill certificates in the CertifyHub registry.",
      },
      { property: "og:title", content: "Issuing dashboard — CertifyHub by Weskill" },
      {
        property: "og:description",
        content: "Issue and manage Weskill certificates in the CertifyHub registry.",
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

const EMPTY_FORM = {
  certificateNumber: "",
  holderName: "",
  certificationTitle: "",
  issueDate: "",
  expiryDate: "",
  grade: "",
};

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchAccess = useServerFn(getStaffAccess);
  const fetchCertificates = useServerFn(listCertificates);
  const addCertificate = useServerFn(createCertificate);
  const changeStatus = useServerFn(setCertificateStatus);

  const access = useQuery({ queryKey: ["staff-access"], queryFn: () => fetchAccess({}) });
  const certificates = useQuery({
    queryKey: ["managed-certificates"],
    queryFn: () => fetchCertificates({}),
  });

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const canIssue = Boolean(access.data?.isAdmin || access.data?.isIssuer);
  const isAdmin = Boolean(access.data?.isAdmin);

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
      await addCertificate({
        data: {
          certificateNumber: form.certificateNumber,
          holderName: form.holderName,
          certificationTitle: form.certificationTitle,
          issueDate: form.issueDate,
          expiryDate: form.expiryDate,
          grade: form.grade,
          status: "active" as const,
        },
      });
      setForm(EMPTY_FORM);
      setMessage({ kind: "ok", text: "Certificate issued and now verifiable." });
      await queryClient.invalidateQueries({ queryKey: ["managed-certificates"] });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not issue that certificate.",
      });
    } finally {
      setSaving(false);
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
            Add credentials to the live Weskill registry. Everything issued here is instantly
            verifiable by anyone — no account needed on their side.
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
            Your account is signed in but has no issuing permissions yet. Ask a Weskill administrator
            to grant you issuer access.
          </p>
        ) : (
          <section className="rounded-3xl border border-border/80 bg-card p-6 shadow-lift sm:p-8">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <ShieldCheck className="size-4 text-emerald" />
              Issue a certificate
            </div>
            <form className="mt-5 grid gap-4 sm:grid-cols-2" onSubmit={handleCreate}>
              <div className="space-y-2">
                <Label htmlFor="certificateNumber">Certificate number</Label>
                <Input
                  id="certificateNumber"
                  required
                  value={form.certificateNumber}
                  onChange={(e) => setForm({ ...form, certificateNumber: e.target.value })}
                  placeholder="WSK-2026-000456"
                  className="h-11 font-mono uppercase"
                />
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
                  onChange={(e) => setForm({ ...form, issueDate: e.target.value })}
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
              <div className="space-y-2">
                <Label htmlFor="grade">Grade (optional)</Label>
                <Input
                  id="grade"
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  placeholder="Distinction"
                  className="h-11"
                />
              </div>
              <div className="flex items-end">
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
                    {isAdmin && <th className="py-3 font-semibold">Actions</th>}
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
                      {isAdmin && (
                        <td className="py-3">
                          {row.status === "revoked" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleStatus(row.id, "active")}
                            >
                              Reinstate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleStatus(row.id, "revoked")}
                            >
                              Revoke
                            </Button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
