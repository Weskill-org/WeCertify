import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Plus,
  ArrowRight,
  ShieldCheck,
  FileText,
  Palette,
  Settings,
  Sparkles,
  ExternalLink,
  Clock,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { SendCertificateDialog } from "@/components/certifyhub/SendCertificateDialog";
import { EmailSettingsDialog } from "@/components/certifyhub/EmailSettingsDialog";
import {
  getStaffAccess,
  listCertificates,
  listTemplates,
  type ManagedCertificate,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title: "Overview — WeCertify Dashboard" },
      {
        name: "description",
        content: "Executive overview of WeCertify registry, credentials, and issuance activity.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardOverview,
});

const STATUS_STYLES: Record<string, string> = {
  active: "border-emerald/40 bg-emerald/10 text-emerald",
  expired: "border-gold/40 bg-gold/10 text-gold",
  revoked: "border-destructive/40 bg-destructive/10 text-destructive",
};

function DashboardOverview() {
  const queryClient = useQueryClient();
  const fetchAccess = useServerFn(getStaffAccess);
  const fetchCertificates = useServerFn(listCertificates);
  const fetchTemplates = useServerFn(listTemplates);

  const access = useQuery({ queryKey: ["staff-access"], queryFn: () => fetchAccess({}) });
  const certificates = useQuery({
    queryKey: ["managed-certificates"],
    queryFn: () => fetchCertificates({}),
  });
  const templates = useQuery({
    queryKey: ["certificate-templates"],
    queryFn: () => fetchTemplates({}),
  });

  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedCertForEmail, setSelectedCertForEmail] = useState<ManagedCertificate | null>(null);
  const [emailSettingsOpen, setEmailSettingsOpen] = useState(false);

  const rows = useMemo(() => certificates.data ?? [], [certificates.data]);
  const templateList = useMemo(() => templates.data ?? [], [templates.data]);

  const canIssue = Boolean(access.data?.isAdmin || access.data?.isIssuer);
  const isAdmin = Boolean(access.data?.isAdmin);

  // Metrics calculations
  const totalCount = rows.length;
  const activeCount = rows.filter((c) => c.status === "active").length;
  const revokedCount = rows.filter((c) => c.status === "revoked").length;
  const emailedCount = rows.filter((c) => Boolean(c.email_sent_at)).length;
  const emailRate = totalCount > 0 ? Math.round((emailedCount / totalCount) * 100) : 0;

  const recentCertificates = useMemo(() => rows.slice(0, 6), [rows]);

  return (
    <div className="space-y-8 animate-rise">
      {/* Top Welcome / Header Banner */}
      <div className="rounded-3xl border border-border/80 bg-gradient-to-br from-card via-card to-surface/80 p-6 sm:p-8 shadow-soft flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="size-2 rounded-full bg-emerald" />
            Live Issuing Registry
          </div>
          <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-foreground">
            Welcome to WeCertify Overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Monitor verified credentials, issue certificates with live templates, and track delivery
            across the Weskill network.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canIssue && (
            <Link to="/dashboard/issue">
              <Button
                size="lg"
                className="gap-2 shadow-gold h-11 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="size-4 text-gold" />
                <span>Issue Certificate</span>
              </Button>
            </Link>
          )}
          <Link to="/dashboard/certificates">
            <Button variant="outline" size="lg" className="h-11">
              <span>View Registry</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Card 1: Total Credentials */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Issued
            </span>
            <div className="size-9 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-center text-primary">
              <Award className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-display text-3xl font-bold text-foreground">
              {certificates.isLoading ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                totalCount.toLocaleString()
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">All credentials in live directory</p>
          </div>
        </div>

        {/* Card 2: Active Verifiable */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Active & Valid
            </span>
            <div className="size-9 rounded-xl border border-emerald/25 bg-emerald/10 flex items-center justify-center text-emerald">
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-display text-3xl font-bold text-foreground">
              {certificates.isLoading ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                activeCount.toLocaleString()
              )}
            </p>
            <p className="mt-1 text-xs text-emerald font-medium">
              100% instantly verifiable online
            </p>
          </div>
        </div>

        {/* Card 3: Revoked */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Revoked
            </span>
            <div className="size-9 rounded-xl border border-destructive/25 bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertTriangle className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-display text-3xl font-bold text-foreground">
              {certificates.isLoading ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                revokedCount.toLocaleString()
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {revokedCount === 0 ? "Zero flagged credentials" : "Flagged/invalidated records"}
            </p>
          </div>
        </div>

        {/* Card 4: Email Dispatch Rate */}
        <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Delivered
            </span>
            <div className="size-9 rounded-xl border border-gold/30 bg-gold/10 flex items-center justify-center text-gold">
              <Mail className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <p className="font-display text-3xl font-bold text-foreground">
              {certificates.isLoading ? (
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              ) : (
                `${emailRate}%`
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {emailedCount} of {totalCount} dispatched
            </p>
          </div>
        </div>
      </div>

      {/* Quick Launchpad Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            to="/dashboard/issue"
            className="group rounded-2xl border border-border/80 bg-card p-5 shadow-sm hover:border-gold/50 hover:shadow-soft transition-all flex flex-col justify-between"
          >
            <div>
              <div className="size-10 rounded-xl bg-gold/10 text-gold flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Sparkles className="size-5" />
              </div>
              <h3 className="font-semibold text-foreground text-sm group-hover:text-gold transition-colors">
                Issue Certificate
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Generate new verifiable credentials with auto-assigned serial numbers and live
                preview.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary group-hover:translate-x-0.5 transition-transform">
              <span>Open Studio</span>
              <ArrowRight className="size-3.5" />
            </div>
          </Link>

          <Link
            to="/dashboard/certificates"
            className="group rounded-2xl border border-border/80 bg-card p-5 shadow-sm hover:border-primary/50 hover:shadow-soft transition-all flex flex-col justify-between"
          >
            <div>
              <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileText className="size-5" />
              </div>
              <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                Registry Directory
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Search, filter by status, inspect verification links, and dispatch recipient emails.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary group-hover:translate-x-0.5 transition-transform">
              <span>Manage Registry</span>
              <ArrowRight className="size-3.5" />
            </div>
          </Link>

          <Link
            to="/dashboard/templates"
            className="group rounded-2xl border border-border/80 bg-card p-5 shadow-sm hover:border-emerald/50 hover:shadow-soft transition-all flex flex-col justify-between"
          >
            <div>
              <div className="size-10 rounded-xl bg-emerald/10 text-emerald flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Palette className="size-5" />
              </div>
              <h3 className="font-semibold text-foreground text-sm group-hover:text-emerald transition-colors">
                Template Studio
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {templateList.length} templates configured. Design HTML/CSS designs and dynamic
                fields.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary group-hover:translate-x-0.5 transition-transform">
              <span>Design Templates</span>
              <ArrowRight className="size-3.5" />
            </div>
          </Link>

          <Link
            to="/dashboard/settings"
            className="group rounded-2xl border border-border/80 bg-card p-5 shadow-sm hover:border-border hover:shadow-soft transition-all flex flex-col justify-between"
          >
            <div>
              <div className="size-10 rounded-xl bg-surface text-foreground flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Settings className="size-5" />
              </div>
              <h3 className="font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
                Settings & Delivery
              </h3>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                Configure SMTP servers, test dispatch connections, and manage issuer permissions.
              </p>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary group-hover:translate-x-0.5 transition-transform">
              <span>Configure System</span>
              <ArrowRight className="size-3.5" />
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Issuances Activity Section */}
      <section className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-lift">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/60">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Recent Credentials
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Showing the most recent certificates added to the live registry.
            </p>
          </div>
          <Link to="/dashboard/certificates">
            <Button variant="outline" size="sm" className="gap-1 text-xs h-8">
              <span>View All ({totalCount})</span>
              <ArrowRight className="size-3" />
            </Button>
          </Link>
        </div>

        {certificates.isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span>Loading registry credentials…</span>
          </div>
        ) : recentCertificates.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <p>No certificates issued yet.</p>
            {canIssue && (
              <Link to="/dashboard/issue" className="mt-3 inline-block">
                <Button size="sm" className="gap-1.5 text-xs">
                  <Plus className="size-3.5" /> Issue First Certificate
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="py-3 pr-4 font-semibold">Number</th>
                  <th className="py-3 pr-4 font-semibold">Holder</th>
                  <th className="py-3 pr-4 font-semibold">Programme</th>
                  <th className="py-3 pr-4 font-semibold">Issued</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Email</th>
                  <th className="py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentCertificates.map((cert) => (
                  <tr
                    key={cert.id}
                    className="border-b border-border/60 last:border-0 hover:bg-surface/50 transition-colors"
                  >
                    <td className="py-3 pr-4 font-mono text-xs font-semibold text-foreground">
                      <a
                        href={`/?id=${encodeURIComponent(cert.certificate_number)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors inline-flex items-center gap-1 group"
                        title="Open public verification page"
                      >
                        <span>{cert.certificate_number}</span>
                        <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </td>
                    <td className="py-3 pr-4 font-medium text-foreground">{cert.holder_name}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{cert.certification_title}</td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">{cert.issue_date}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          STATUS_STYLES[cert.status] ?? "border-border bg-surface"
                        }`}
                      >
                        {cert.status}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {cert.email_sent_at ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald">
                          <CheckCircle2 className="size-3" /> Sent
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 italic">Pending</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCertForEmail(cert);
                          setSendDialogOpen(true);
                        }}
                        className="h-7 text-xs gap-1 border-gold/30 text-gold hover:bg-gold/10"
                      >
                        <Mail className="size-3" />
                        <span>{cert.email_sent_at ? "Resend" : "Send"}</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Send Certificate Dialog modal */}
      <SendCertificateDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        certificate={selectedCertForEmail}
        isPostCreation={false}
        isAdmin={isAdmin}
        onOpenEmailSettings={() => setEmailSettingsOpen(true)}
        onEmailSent={() => {
          void queryClient.invalidateQueries({ queryKey: ["managed-certificates"] });
        }}
      />

      {/* Email Settings Dialog for quick config */}
      <EmailSettingsDialog open={emailSettingsOpen} onOpenChange={setEmailSettingsOpen} />
    </div>
  );
}
