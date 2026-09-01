import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Loader2, QrCode, ScanLine, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrScannerDialog } from "./QrScannerDialog";
import { VerificationResultPanel } from "./VerificationResult";
import { verifyCertificate, type VerificationResult } from "@/lib/certificates.functions";

const SAMPLES = ["WSK-2025-000123", "WSK-2024-000789", "WSK-2024-000321"];

export function VerificationPanel() {
  const verify = useServerFn(verifyCertificate);
  const [value, setValue] = useState("");
  const [phase, setPhase] = useState<"idle" | "checking" | "done">("idle");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);

  const runVerification = useCallback(
    async (certificateNumber: string) => {
      const trimmed = certificateNumber.trim();
      if (trimmed.length < 4) {
        setError("Please enter a valid certificate number.");
        return;
      }
      setError(null);
      setPhase("checking");
      setResult(null);
      try {
        const started = Date.now();
        const data = await verify({ data: { certificateNumber: trimmed } });
        const elapsed = Date.now() - started;
        if (elapsed < 700) await new Promise((r) => setTimeout(r, 700 - elapsed));
        setResult(data);
        setPhase("done");
      } catch {
        setError("Verification is temporarily unavailable. Please try again in a moment.");
        setPhase("idle");
      }
    },
    [verify],
  );

  const handleDetected = useCallback(
    (id: string) => {
      setScannerOpen(false);
      setValue(id);
      void runVerification(id);
    },
    [runVerification],
  );

  return (
    <div
      id="verify"
      className="relative rounded-3xl border border-border/80 bg-card/95 p-5 shadow-lift backdrop-blur sm:p-8"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <ShieldCheck className="size-4 text-emerald" />
        Certificate verification
      </div>

      {phase === "done" && result ? (
        <div className="mt-5">
          <VerificationResultPanel
            result={result}
            onReset={() => {
              setPhase("idle");
              setResult(null);
              setValue("");
            }}
          />
        </div>
      ) : phase === "checking" ? (
        <div className="mt-6 flex flex-col items-center gap-4 py-12 text-center">
          <span className="relative flex size-16 items-center justify-center rounded-2xl border border-gold/40 bg-gold/10">
            <Loader2 className="size-7 animate-spin text-gold" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold text-foreground">
              Checking the Weskill registry…
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Matching {value.toUpperCase()} against issued credentials.
            </p>
          </div>
          <div className="animate-shimmer h-1 w-48 rounded-full bg-[linear-gradient(90deg,transparent,var(--gold),transparent)]" />
        </div>
      ) : (
        <div className="mt-5 space-y-5">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              void runVerification(value);
            }}
          >
            <Label htmlFor="certificate-number" className="text-sm font-semibold">
              Certificate number / ID
            </Label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                id="certificate-number"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="WSK-2025-000123"
                autoComplete="off"
                spellCheck={false}
                maxLength={64}
                aria-invalid={error ? true : undefined}
                className="h-12 flex-1 font-mono text-base uppercase tracking-wide"
              />
              <Button type="submit" size="lg" className="h-12 px-6">
                Verify
                <ArrowRight className="size-4" />
              </Button>
            </div>
            {error && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            )}
          </form>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              or
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={() => setScannerOpen(true)}
            className="group flex w-full items-center gap-4 rounded-2xl border border-dashed border-border bg-surface/70 p-4 text-left transition-all hover:border-gold/60 hover:bg-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-gold-gradient text-gold-foreground shadow-gold transition-transform group-hover:scale-105">
              <QrCode className="size-6" />
            </span>
            <span className="flex-1">
              <span className="block font-semibold text-foreground">Scan the QR code</span>
              <span className="mt-0.5 block text-sm text-muted-foreground">
                Use your camera, or upload a photo of the QR code instead.
              </span>
            </span>
            <ScanLine className="size-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </button>

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">Try a demo ID:</span>
            {SAMPLES.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setValue(sample);
                  void runVerification(sample);
                }}
                className="rounded-full border border-border bg-background px-2.5 py-1 font-mono transition-colors hover:border-gold/60 hover:text-foreground"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>
      )}

      <QrScannerDialog
        open={scannerOpen}
        onOpenChange={setScannerOpen}
        onDetected={handleDetected}
      />
    </div>
  );
}
