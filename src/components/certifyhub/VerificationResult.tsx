import { BadgeCheck, CalendarClock, FileSearch, ShieldAlert, ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TemplatePreview } from "@/components/certifyhub/TemplatePreview";
import { cn } from "@/lib/utils";
import type { CertificateRecord, VerificationResult } from "@/lib/certificates.functions";

function formatDate(value: string | null): string {
  if (!value) return "No expiry";
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

const TONES = {
  verified: {
    label: "Verified certificate",
    icon: BadgeCheck,
    ring: "border-emerald/40",
    chip: "bg-emerald/12 text-emerald border-emerald/30",
    glow: "bg-emerald/10",
  },
  expired: {
    label: "Certificate expired",
    icon: CalendarClock,
    ring: "border-gold/40",
    chip: "bg-gold/15 text-gold-foreground border-gold/40 dark:text-gold",
    glow: "bg-gold/10",
  },
  revoked: {
    label: "Certificate revoked",
    icon: ShieldX,
    ring: "border-destructive/40",
    chip: "bg-destructive/10 text-destructive border-destructive/30",
    glow: "bg-destructive/10",
  },
} as const;

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-t border-border/70 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-semibold text-foreground sm:text-right">{value}</dd>
    </div>
  );
}

function CertificateCard({
  certificate,
  tone,
  note,
}: {
  certificate: CertificateRecord;
  tone: keyof typeof TONES;
  note?: string | undefined;
}) {
  const config = TONES[tone];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "animate-rise relative overflow-hidden rounded-2xl border bg-card p-6 shadow-lift sm:p-8",
        config.ring,
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute -right-16 -top-16 size-48 rounded-full blur-3xl",
          config.glow,
        )}
        aria-hidden="true"
      />
      <div className="relative flex flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "animate-seal flex size-12 items-center justify-center rounded-xl border",
                config.chip,
              )}
            >
              <Icon className="size-6" />
            </span>
            <div>
              <p
                className={cn(
                  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em]",
                  config.chip,
                )}
              >
                {config.label}
              </p>
              <h3 className="mt-2 text-xl font-semibold text-foreground sm:text-2xl">
                {certificate.holder_name}
              </h3>
            </div>
          </div>
        </div>

        <p className="text-balance-tight text-base text-muted-foreground">
          {certificate.certification_title}
        </p>

        {note && (
          <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted-foreground">
            {note}
          </p>
        )}

        <dl className="mt-1">
          <DetailRow label="Certificate no." value={certificate.certificate_number} />
          <DetailRow label="Issue date" value={formatDate(certificate.issue_date)} />
          <DetailRow label="Valid until" value={formatDate(certificate.expiry_date)} />
          {certificate.grade && <DetailRow label="Result" value={certificate.grade} />}
          <DetailRow label="Issuing authority" value={certificate.issuing_authority} />
        </dl>

        {certificate.rendered_html && (
          <TemplatePreview
            html={certificate.rendered_html}
            title={`Certificate ${certificate.certificate_number}`}
            className="h-[420px] w-full rounded-2xl border border-border bg-white"
          />
        )}
      </div>
    </div>
  );
}

export function VerificationResultPanel({
  result,
  onReset,
}: {
  result: VerificationResult;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {result.outcome === "not_found" ? (
        <div className="animate-rise rounded-2xl border border-border bg-card p-6 shadow-lift sm:p-8">
          <span className="flex size-12 items-center justify-center rounded-xl border border-border bg-surface">
            <FileSearch className="size-6 text-muted-foreground" />
          </span>
          <h3 className="mt-4 text-xl font-semibold text-foreground">
            No matching certificate found
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            We couldn't find a record for{" "}
            <span className="font-semibold text-foreground">{result.query}</span> in the Weskill
            registry. This usually means a typo rather than a problem with the certificate.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gold" />
              Check the certificate number, including dashes (e.g. WE-2025-000123).
            </li>
            <li className="flex gap-2">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gold" />
              Try scanning the QR code on the certificate instead of typing.
            </li>
            <li className="flex gap-2">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-gold" />
              Still stuck? Contact Weskill support with a copy of the certificate.
            </li>
          </ul>
        </div>
      ) : (
        <CertificateCard
          certificate={result.certificate}
          tone={result.outcome}
          note={
            result.outcome === "expired"
              ? "This credential was genuinely issued by Weskill but has passed its validity period. Ask the holder for a renewed certificate."
              : result.outcome === "revoked"
                ? "This credential has been withdrawn by the issuing authority and should no longer be treated as valid."
                : undefined
          }
        />
      )}

      <Button variant="outline" onClick={onReset} className="self-start">
        Verify another certificate
      </Button>
    </div>
  );
}
