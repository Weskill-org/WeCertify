import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Plus,
  Filter,
  Loader2,
  RefreshCw,
  X,
  ChevronLeft,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SendCertificateDialog } from "@/components/certifyhub/SendCertificateDialog";
import { EmailSettingsDialog } from "@/components/certifyhub/EmailSettingsDialog";
import {
  getStaffAccess,
  listCertificates,
  setCertificateStatus,
  type ManagedCertificate,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard/certificates")({
  head: () => ({
    meta: [
      { title: "Certificate Registry — WeCertify" },
      {
        name: "description",
        content: "Search, verify and manage Weskill certificate records in the official directory.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CertificatesRegistryPage,
});

const STATUS_STYLES: Record<string, string> = {
  active: "border-emerald/40 bg-emerald/10 text-emerald",
  expired: "border-gold/40 bg-gold/10 text-gold",
  revoked: "border-destructive/40 bg-destructive/10 text-destructive",
};

function CertificatesRegistryPage() {
  const queryClient = useQueryClient();
  const fetchAccess = useServerFn(getStaffAccess);
  const fetchCertificates = useServerFn(listCertificates);
  const changeStatus = useServerFn(setCertificateStatus);

  const access = useQuery({ queryKey: ["staff-access"], queryFn: () => fetchAccess({}) });
  const certificates = useQuery({
    queryKey: ["managed-certificates"],
    queryFn: () => fetchCertificates({}),
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expired" | "revoked">("all");
  const [emailFilter, setEmailFilter] = useState<"all" | "emailed" | "pending">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Email Dialog State
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [selectedCertForEmail, setSelectedCertForEmail] = useState<ManagedCertificate | null>(null);
  const [emailSettingsOpen, setEmailSettingsOpen] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const isAdmin = Boolean(access.data?.isAdmin);
  const canIssue = Boolean(access.data?.isAdmin || access.data?.isIssuer);

  const rows = useMemo(() => certificates.data ?? [], [certificates.data]);

  // Filtering
  const filteredRows = useMemo(() => {
    let result = rows;

    if (statusFilter !== "all") {
      result = result.filter((r) => r.status === statusFilter);
    }

    if (emailFilter === "emailed") {
      result = result.filter((r) => Boolean(r.email_sent_at));
    } else if (emailFilter === "pending") {
      result = result.filter((r) => !r.email_sent_at);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (r) =>
          r.certificate_number.toLowerCase().includes(q) ||
          r.holder_name.toLowerCase().includes(q) ||
          r.certification_title.toLowerCase().includes(q) ||
          (r.recipient_email && r.recipient_email.toLowerCase().includes(q)),
      );
    }

    return result;
  }, [rows, statusFilter, emailFilter, searchQuery]);

  // Counts for pills
  const counts = useMemo(() => {
    return {
      all: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      expired: rows.filter((r) => r.status === "expired").length,
      revoked: rows.filter((r) => r.status === "revoked").length,
      emailed: rows.filter((r) => Boolean(r.email_sent_at)).length,
      pending: rows.filter((r) => !r.email_sent_at).length,
    };
  }, [rows]);

  async function handleStatus(id: string, status: "active" | "revoked") {
    try {
      await changeStatus({ data: { id, status } });
      setMessage({
        kind: "ok",
        text: `Certificate status marked as ${status}.`,
      });
      await queryClient.invalidateQueries({ queryKey: ["managed-certificates"] });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not update status.",
      });
    }
  }

  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  };

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
            <span className="text-foreground font-medium">Registry</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground">
              Certificate Registry
            </h1>
            <span className="rounded-full bg-primary/10 text-primary px-3 py-0.5 text-xs font-semibold">
              {rows.length} Total
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Authoritative registry of all issued credentials, delivery statuses, and public
            verification links.
          </p>
        </div>

        {canIssue && (
          <Link to="/dashboard/issue">
            <Button className="h-10 gap-2 shadow-gold bg-primary text-primary-foreground">
              <Plus className="size-4 text-gold" />
              <span>Issue Certificate</span>
            </Button>
          </Link>
        )}
      </div>

      {message && (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-sm font-medium flex items-center justify-between ${
            message.kind === "ok"
              ? "border-emerald/40 bg-emerald/10 text-emerald"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          <span>{message.text}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMessage(null)}
            className="h-6 w-6 p-0"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      )}

      {/* Search & Filters Toolbar */}
      <div className="rounded-3xl border border-border/80 bg-card p-5 sm:p-6 shadow-soft space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by number, holder, programme, or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 pr-8 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Quick Refresh */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                void queryClient.invalidateQueries({ queryKey: ["managed-certificates"] })
              }
              disabled={certificates.isFetching}
              className="h-10 gap-1.5 text-xs text-muted-foreground"
              title="Refresh Registry"
            >
              <RefreshCw className={`size-3.5 ${certificates.isFetching ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/60 text-xs">
          <span className="text-muted-foreground font-medium mr-1 flex items-center gap-1">
            <Filter className="size-3" /> Status:
          </span>

          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === "all"
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-surface hover:bg-surface/80 text-muted-foreground"
            }`}
          >
            All ({counts.all})
          </button>

          <button
            onClick={() => setStatusFilter("active")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === "active"
                ? "bg-emerald/20 text-emerald font-semibold border border-emerald/40"
                : "bg-surface hover:bg-surface/80 text-muted-foreground"
            }`}
          >
            Active ({counts.active})
          </button>

          <button
            onClick={() => setStatusFilter("expired")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === "expired"
                ? "bg-gold/20 text-gold font-semibold border border-gold/40"
                : "bg-surface hover:bg-surface/80 text-muted-foreground"
            }`}
          >
            Expired ({counts.expired})
          </button>

          <button
            onClick={() => setStatusFilter("revoked")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === "revoked"
                ? "bg-destructive/20 text-destructive font-semibold border border-destructive/40"
                : "bg-surface hover:bg-surface/80 text-muted-foreground"
            }`}
          >
            Revoked ({counts.revoked})
          </button>

          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

          <span className="text-muted-foreground font-medium mr-1 flex items-center gap-1">
            <Mail className="size-3" /> Email:
          </span>

          <button
            onClick={() => setEmailFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              emailFilter === "all"
                ? "bg-primary text-primary-foreground font-semibold"
                : "bg-surface hover:bg-surface/80 text-muted-foreground"
            }`}
          >
            All
          </button>

          <button
            onClick={() => setEmailFilter("emailed")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              emailFilter === "emailed"
                ? "bg-emerald/20 text-emerald font-semibold border border-emerald/40"
                : "bg-surface hover:bg-surface/80 text-muted-foreground"
            }`}
          >
            Emailed ({counts.emailed})
          </button>

          <button
            onClick={() => setEmailFilter("pending")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              emailFilter === "pending"
                ? "bg-surface text-foreground font-semibold border border-border"
                : "bg-surface hover:bg-surface/80 text-muted-foreground"
            }`}
          >
            Pending ({counts.pending})
          </button>

          {(statusFilter !== "all" || emailFilter !== "all" || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter("all");
                setEmailFilter("all");
                setSearchQuery("");
              }}
              className="h-7 text-xs text-muted-foreground hover:text-foreground ml-auto"
            >
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* Registry Table Section */}
      <section className="rounded-3xl border border-border/80 bg-card p-6 sm:p-8 shadow-lift">
        <div className="flex items-center justify-between pb-4 border-b border-border/60">
          <div className="text-sm text-muted-foreground">
            Showing <strong>{filteredRows.length}</strong> of {rows.length} certificates
          </div>
        </div>

        {certificates.isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span>Loading certificate registry…</span>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground space-y-3">
            <div className="size-12 rounded-full bg-surface text-muted-foreground flex items-center justify-center mx-auto">
              <Search className="size-5" />
            </div>
            <p className="font-medium text-foreground">
              No certificates match your search or filter.
            </p>
            <p className="text-xs max-w-sm mx-auto">
              Try adjusting your query or resetting filters to view all registry credentials.
            </p>
            {(statusFilter !== "all" || emailFilter !== "all" || searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatusFilter("all");
                  setEmailFilter("all");
                  setSearchQuery("");
                }}
                className="mt-2 text-xs"
              >
                Clear all filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  <th className="py-3.5 pr-4 font-semibold">Certificate Number</th>
                  <th className="py-3.5 pr-4 font-semibold">Holder Name</th>
                  <th className="py-3.5 pr-4 font-semibold">Certification Programme</th>
                  <th className="py-3.5 pr-4 font-semibold">Issued Date</th>
                  <th className="py-3.5 pr-4 font-semibold">Status</th>
                  <th className="py-3.5 pr-4 font-semibold">Email Delivery</th>
                  <th className="py-3.5 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/60 last:border-0 hover:bg-surface/50 transition-colors"
                  >
                    {/* Certificate Number & Copy Link */}
                    <td className="py-3.5 pr-4 font-mono text-xs">
                      <div className="flex items-center gap-1.5">
                        <a
                          href={`/?id=${encodeURIComponent(row.certificate_number)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group"
                          title="Open public verification page"
                        >
                          <span>{row.certificate_number}</span>
                          <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                        <button
                          onClick={() => handleCopy(row.certificate_number)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-1"
                          title="Copy certificate number"
                        >
                          {copiedId === row.certificate_number ? (
                            <Check className="size-3 text-emerald" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Holder Name */}
                    <td className="py-3.5 pr-4 font-medium text-foreground">
                      {row.holder_name}
                      {row.grade && (
                        <span className="block text-[11px] text-muted-foreground">
                          Grade: {row.grade}
                        </span>
                      )}
                    </td>

                    {/* Programme */}
                    <td className="py-3.5 pr-4 text-muted-foreground">{row.certification_title}</td>

                    {/* Issue Date */}
                    <td className="py-3.5 pr-4 text-muted-foreground text-xs whitespace-nowrap">
                      {row.issue_date}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 pr-4">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${
                          STATUS_STYLES[row.status] ?? "border-border bg-surface"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>

                    {/* Email Delivery */}
                    <td className="py-3.5 pr-4">
                      {row.email_sent_at ? (
                        <div className="flex flex-col gap-0.5">
                          <span
                            className="inline-flex w-fit items-center gap-1 rounded-full border border-emerald/40 bg-emerald/10 px-2.5 py-0.5 text-xs font-medium text-emerald"
                            title={`Sent at: ${new Date(row.email_sent_at).toLocaleString()}`}
                          >
                            <CheckCircle2 className="size-3" /> Emailed
                          </span>
                          {row.recipient_email && (
                            <span
                              className="text-[11px] text-muted-foreground truncate max-w-[140px]"
                              title={row.recipient_email}
                            >
                              {row.recipient_email}
                            </span>
                          )}
                        </div>
                      ) : row.recipient_email ? (
                        <div className="flex flex-col gap-0.5">
                          <span
                            className="text-xs text-muted-foreground truncate max-w-[140px] block"
                            title={row.recipient_email}
                          >
                            {row.recipient_email}
                          </span>
                          <span className="text-[10px] text-amber-600 font-medium">
                            Pending dispatch
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground/60 italic">
                          No email set
                        </span>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedCertForEmail(row);
                            setSendDialogOpen(true);
                          }}
                          className="h-8 gap-1.5 text-xs border-gold/30 text-gold hover:bg-gold/10 hover:text-gold"
                          title="Send certificate to recipient via email"
                        >
                          <Mail className="size-3.5" />
                          <span>{row.email_sent_at ? "Resend" : "Send"}</span>
                        </Button>

                        {isAdmin &&
                          (row.status === "revoked" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleStatus(row.id, "active")}
                              className="h-8 text-xs text-emerald hover:bg-emerald/10"
                            >
                              Reinstate
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleStatus(row.id, "revoked")}
                              className="h-8 text-xs text-destructive hover:bg-destructive/10"
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

      {/* Send Certificate Dialog */}
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

      {/* Email settings dialog */}
      <EmailSettingsDialog open={emailSettingsOpen} onOpenChange={setEmailSettingsOpen} />
    </div>
  );
}
