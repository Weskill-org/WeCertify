import { QRCodeSVG } from "qrcode.react";
import {
  Database,
  Fingerprint,
  KeyRound,
  QrCode,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Timer,
} from "lucide-react";

import { BrandLockup } from "./Brand";

const STEPS = [
  {
    icon: KeyRound,
    title: "Enter or scan",
    body: "Type the certificate number printed on the credential, or scan its QR code with your camera.",
  },
  {
    icon: Database,
    title: "Registry lookup",
    body: "We query the Weskill certification registry directly — no cached copies, no manual checks.",
  },
  {
    icon: ShieldCheck,
    title: "Instant verdict",
    body: "You see the holder, programme, issue date and current validity status in under a second.",
  },
];

const TRUST = [
  {
    icon: Fingerprint,
    title: "Single source of truth",
    body: "Every result comes from the same registry Weskill uses to issue credentials, so there is no drift between certificate and record.",
  },
  {
    icon: Timer,
    title: "Real-time status",
    body: "Expiry and revocation are evaluated at the moment you check, not baked into the printed certificate.",
  },
  {
    icon: ScanLine,
    title: "Tamper-evident QR",
    body: "Each certificate carries a QR code that resolves to its registry entry — edited PDFs cannot fake a match.",
  },
  {
    icon: Sparkles,
    title: "Built for recruiters",
    body: "No account, no paperwork, no waiting on email confirmations. Share a link and let anyone verify themselves.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-border bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          How verification works
        </p>
        <h2 className="mt-3 max-w-2xl text-3xl font-semibold text-balance-tight sm:text-4xl">
          Three steps between a certificate and certainty
        </h2>

        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="group relative rounded-2xl border border-border bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
            >
              <span className="absolute right-6 top-6 font-display text-4xl font-semibold text-border">
                0{index + 1}
              </span>
              <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <step.icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function WhyTrust({ sampleQrValue }: { sampleQrValue: string }) {
  return (
    <section id="why-trust" className="border-t border-border bg-surface py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Why trust CertifyHub
          </p>
          <h2 className="mt-3 text-3xl font-semibold text-balance-tight sm:text-4xl">
            The credentialing authority behind every Weskill certificate
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {TRUST.map((item) => (
              <div key={item.title} className="flex gap-4">
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border border-gold/40 bg-gold/10 text-gold">
                  <item.icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-7 shadow-lift">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <QrCode className="size-4 text-gold" />
            Test the scan flow
          </div>
          <div className="mt-6 flex justify-center rounded-2xl border border-border bg-background p-6">
            <QRCodeSVG
              value={sampleQrValue}
              size={188}
              level="M"
              marginSize={2}
              bgColor="transparent"
              fgColor="currentColor"
              className="text-foreground"
              title="Sample Weskill certificate QR code"
            />
          </div>
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            This is a live QR code for sample certificate{" "}
            <span className="font-mono font-semibold text-foreground">WSK-2025-000123</span>. Open
            the scanner above on your phone and point it at this screen to see the full verification
            flow end to end.
          </p>
        </div>
      </div>
    </section>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-hero-gradient text-primary-foreground">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <BrandLockup onDark />
            <p className="mt-5 text-sm leading-relaxed text-primary-foreground/70">
              CertifyHub is the official verification service for credentials issued by Weskill.
              Anyone can confirm a certificate's authenticity in seconds — free, and without an
              account.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 text-sm sm:gap-16">
            <div>
              <p className="font-semibold uppercase tracking-[0.16em] text-primary-foreground/50">
                Verify
              </p>
              <ul className="mt-4 space-y-2.5 text-primary-foreground/80">
                <li>
                  <a href="#verify" className="transition-colors hover:text-gold">
                    Check a certificate
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="transition-colors hover:text-gold">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#why-trust" className="transition-colors hover:text-gold">
                    Why trust us
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-semibold uppercase tracking-[0.16em] text-primary-foreground/50">
                Weskill
              </p>
              <ul className="mt-4 space-y-2.5 text-primary-foreground/80">
                <li>Certification authority</li>
                <li>Learner support</li>
                <li>Employer enquiries</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-primary-foreground/15 pt-6 text-xs text-primary-foreground/55 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Weskill. All rights reserved.</p>
          <p>CertifyHub — trusted verification for Weskill certificates.</p>
        </div>
      </div>
    </footer>
  );
}
