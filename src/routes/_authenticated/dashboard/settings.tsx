import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Settings,
  Mail,
  Users,
  Shield,
  ShieldCheck,
  ChevronLeft,
  ExternalLink,
  Server,
  Sparkles,
  Key,
  Globe,
  CheckCircle2,
  Lock,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmailSettingsDialog } from "@/components/certifyhub/EmailSettingsDialog";
import { IssuerManagerDialog } from "@/components/certifyhub/IssuerManagerDialog";
import { getStaffAccess } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Administration — WeCertify" },
      {
        name: "description",
        content: "Configure email delivery, SMTP servers, and team issuer permissions.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const fetchAccess = useServerFn(getStaffAccess);
  const access = useQuery({ queryKey: ["staff-access"], queryFn: () => fetchAccess({}) });

  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [issuersDialogOpen, setIssuersDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("email");

  const isAdmin = Boolean(access.data?.isAdmin);
  const canIssue = Boolean(access.data?.isAdmin || access.data?.isIssuer);

  if (access.isLoading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span>Loading system settings…</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-rise">
      {/* Breadcrumb & Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Link to="/dashboard" className="hover:text-foreground flex items-center gap-0.5">
            <ChevronLeft className="size-3" /> Dashboard
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Settings</span>
        </div>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
            Settings & Administration
          </h1>
          <span className="rounded-full bg-primary/10 text-primary px-3 py-0.5 text-xs font-semibold">
            {isAdmin ? "Full Admin Access" : "Staff Access"}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure email delivery servers, manage staff issuer permissions, and inspect registry
          authority profiles.
        </p>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card border border-border/80 p-1 rounded-2xl h-auto">
          <TabsTrigger
            value="email"
            className="rounded-xl py-2 px-4 gap-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Mail className="size-3.5" />
            <span>Email & SMTP Delivery</span>
          </TabsTrigger>
          <TabsTrigger
            value="team"
            className="rounded-xl py-2 px-4 gap-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Users className="size-3.5" />
            <span>Staff & Issuers</span>
          </TabsTrigger>
          <TabsTrigger
            value="organization"
            className="rounded-xl py-2 px-4 gap-2 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Globe className="size-3.5" />
            <span>Authority & Registry</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Email & SMTP */}
        <TabsContent value="email" className="space-y-6">
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-lift space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                  <Mail className="size-5 text-gold" />
                  SMTP & Certificate Email Delivery
                </h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                  Connect your custom SMTP mail server (Gmail, SendGrid, Amazon SES, or custom
                  corporate host) to email verifiable PDF credentials directly to recipients.
                </p>
              </div>

              {isAdmin ? (
                <Button
                  onClick={() => setEmailDialogOpen(true)}
                  className="h-10 gap-2 shadow-gold bg-primary text-primary-foreground"
                >
                  <Server className="size-4 text-gold" />
                  <span>Configure SMTP</span>
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Admin permissions required to modify SMTP
                </span>
              )}
            </div>

            {/* Email configuration overview cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border/70 bg-surface/40 p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                  <CheckCircle2 className="size-4 text-emerald" />
                  Automated PDF Dispatch
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When a certificate is issued, WeCertify can immediately package the certificate
                  into a high-definition PDF and email it directly to the student or recipient with
                  a one-click verification link.
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEmailDialogOpen(true)}
                    className="text-xs h-8"
                  >
                    Open Email Studio & Templates
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-surface/40 p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-foreground">
                  <Sparkles className="size-4 text-gold" />
                  Dynamic Template Placeholders
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Customize the email message body using dynamic variables that are auto-populated
                  upon issuance:
                </p>
                <div className="flex flex-wrap gap-1.5 text-[11px] font-mono text-muted-foreground">
                  <span className="rounded bg-background px-2 py-0.5 border border-border">
                    {"{{holder_name}}"}
                  </span>
                  <span className="rounded bg-background px-2 py-0.5 border border-border">
                    {"{{certification_title}}"}
                  </span>
                  <span className="rounded bg-background px-2 py-0.5 border border-border">
                    {"{{certificate_number}}"}
                  </span>
                  <span className="rounded bg-background px-2 py-0.5 border border-border">
                    {"{{verification_url}}"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Team & Issuers */}
        <TabsContent value="team" className="space-y-6">
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-lift space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                  <Users className="size-5 text-emerald" />
                  Staff & Issuers Directory
                </h2>
                <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                  Control who has authority to issue certificates, edit templates, and manage
                  official Weskill registry credentials.
                </p>
              </div>

              {isAdmin ? (
                <Button
                  onClick={() => setIssuersDialogOpen(true)}
                  className="h-10 gap-2 border-emerald/40 bg-emerald/10 text-emerald hover:bg-emerald/20 shadow-sm"
                  variant="outline"
                >
                  <Users className="size-4" />
                  <span>Manage Issuers</span>
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground italic">
                  Admin permissions required to manage staff roles
                </span>
              )}
            </div>

            {/* Current user role card */}
            <div className="rounded-2xl border border-border/70 bg-surface/50 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-display font-bold text-lg">
                  {access.data?.email?.slice(0, 1).toUpperCase() ?? "U"}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{access.data?.email}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Role:{" "}
                    <strong className="text-foreground">
                      {isAdmin ? "Administrator" : canIssue ? "Certified Issuer" : "Read-only"}
                    </strong>
                  </p>
                </div>
              </div>

              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                  isAdmin
                    ? "border-gold/40 bg-gold/15 text-gold"
                    : canIssue
                      ? "border-emerald/40 bg-emerald/15 text-emerald"
                      : "border-border bg-surface text-muted-foreground"
                }`}
              >
                {isAdmin ? "Administrator" : canIssue ? "Issuer Access" : "Read Access"}
              </span>
            </div>

            {/* Role capabilities explanation */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="rounded-2xl border border-border/70 p-5 bg-card space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <ShieldCheck className="size-4 text-emerald" />
                  <span>Issuer Capabilities</span>
                </div>
                <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
                  <li>Issue official certificates with verified numbers</li>
                  <li>Dispatch certificates to recipients via email</li>
                  <li>Search and browse the full registry</li>
                  <li>Author and preview certificate templates</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border/70 p-5 bg-card space-y-2">
                <div className="flex items-center gap-2 font-semibold text-foreground">
                  <Shield className="size-4 text-gold" />
                  <span>Administrator Capabilities</span>
                </div>
                <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
                  <li>All Issuer permissions included</li>
                  <li>Invite new team members & assign roles</li>
                  <li>Configure organization SMTP email server</li>
                  <li>Revoke and reinstate issued credentials</li>
                  <li>Permanently delete or archive templates</li>
                </ul>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Tab 3: Organization & Authority */}
        <TabsContent value="organization" className="space-y-6">
          <div className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-lift space-y-6">
            <div>
              <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
                <Globe className="size-5 text-primary" />
                Registry Authority & Verification Configuration
              </h2>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                Cryptographic integrity and public verification parameters for credentials issued
                through WeCertify.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-border/70 bg-surface/40 p-5 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Issuing Authority
                </span>
                <p className="font-display text-lg font-bold text-foreground">
                  Weskill Certification Authority
                </p>
                <p className="text-xs text-muted-foreground">
                  Default signatory authority encoded into all verifiable QR codes and PDF
                  credentials.
                </p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-surface/40 p-5 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Verification Portal Endpoint
                </span>
                <p className="font-mono text-sm font-semibold text-foreground break-all">
                  https://certify.weskill.org/?id=WE-YYYY-XXXXXXXX
                </p>
                <div className="pt-1">
                  <Link
                    to="/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                  >
                    <span>Test Public Portal</span>
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald/30 bg-emerald/5 p-5 text-xs space-y-2 text-muted-foreground">
              <div className="flex items-center gap-2 font-semibold text-emerald">
                <Lock className="size-4" />
                <span>Tamper-Resistant Serial Numbering</span>
              </div>
              <p>
                Every credential issued uses a time-based alphanumeric code (e.g.{" "}
                <code className="font-mono font-semibold">WE-2026-Y38AE4TC</code>) with strict
                uniqueness checks in the Postgres registry. Anyone can verify authenticity without
                requiring an account.
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Email Settings Dialog */}
      <EmailSettingsDialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen} />

      {/* Issuer Manager Dialog */}
      <IssuerManagerDialog
        open={issuersDialogOpen}
        onOpenChange={setIssuersDialogOpen}
        currentUserEmail={access.data?.email}
      />
    </div>
  );
}
