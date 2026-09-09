import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Lock, ShieldCheck, Zap } from "lucide-react";

import { BrandLockup } from "@/components/certifyhub/Brand";
import { VerificationPanel } from "@/components/certifyhub/VerificationPanel";
import { HowItWorks, SiteFooter, WhyTrust } from "@/components/certifyhub/Sections";

const TITLE = "WeCertify by Weskill — Verify a Weskill Certificate";
const DESCRIPTION =
  "Instantly confirm the authenticity of any Weskill certificate. Enter the certificate number or scan its QR code to see the holder, programme and validity status.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TRUST_SIGNALS = [
  { icon: ShieldCheck, label: "Trusted verification for Weskill certificates" },
  { icon: Zap, label: "Results in under a second" },
  { icon: Lock, label: "No account required" },
];

// Stable, SSR-safe absolute URL so the rendered QR matches between server and client.
const SAMPLE_QR_VALUE =
  "https://project--3a3f6455-7df7-477f-abc6-f7788111b229.lovable.app/?id=WE-2025-000123";

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-hero-gradient">
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5"
          aria-label="Main"
        >
          <BrandLockup onDark />
          <div className="hidden items-center gap-8 text-sm font-medium text-primary-foreground/75 md:flex">
            <a href="#how-it-works" className="transition-colors hover:text-gold">
              How it works
            </a>
            <a href="#why-trust" className="transition-colors hover:text-gold">
              Why trust us
            </a>
            <Link to="/auth" className="transition-colors hover:text-gold">
              Staff sign in
            </Link>
            <a
              href="#verify"
              className="rounded-full bg-gold-gradient px-4 py-2 font-semibold text-gold-foreground shadow-gold transition-transform hover:scale-[1.03]"
            >
              Verify now
            </a>
          </div>

        </nav>

        <div className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute -left-24 top-0 size-[28rem] rounded-full bg-gold/10 blur-3xl"
            aria-hidden="true"
          />
          <div className="relative mx-auto grid max-w-6xl gap-12 px-6 pb-24 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-32 lg:pt-20">
            <div className="animate-rise">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-3 py-1.5 text-xs font-medium text-primary-foreground/80">
                <span className="size-1.5 rounded-full bg-emerald" />
                Official Weskill credential registry
              </span>

              <h1 className="mt-6 font-display text-4xl font-semibold leading-[1.08] text-balance-tight text-primary-foreground sm:text-5xl lg:text-6xl">
                Verify certificate authenticity{" "}
                <span className="bg-gold-gradient bg-clip-text text-transparent">instantly</span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-relaxed text-primary-foreground/70">
                WeCertify checks any Weskill certificate against the live issuing registry — so
                employers, institutions and partners can trust what they're looking at in seconds.
              </p>

              <ul className="mt-9 space-y-3">
                {TRUST_SIGNALS.map((signal) => (
                  <li
                    key={signal.label}
                    className="flex items-center gap-3 text-sm text-primary-foreground/85"
                  >
                    <span className="flex size-7 items-center justify-center rounded-md border border-gold/30 bg-gold/10 text-gold">
                      <signal.icon className="size-4" />
                    </span>
                    {signal.label}
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex items-center gap-6 border-t border-primary-foreground/15 pt-6">
                <div>
                  <p className="font-display text-2xl font-semibold text-primary-foreground">
                    24,000+
                  </p>
                  <p className="text-xs uppercase tracking-[0.16em] text-primary-foreground/50">
                    Credentials issued
                  </p>
                </div>
                <span className="h-10 w-px bg-primary-foreground/15" />
                <div>
                  <p className="flex items-center gap-1.5 font-display text-2xl font-semibold text-primary-foreground">
                    <CheckCircle2 className="size-5 text-emerald" />
                    Live
                  </p>
                  <p className="text-xs uppercase tracking-[0.16em] text-primary-foreground/50">
                    Registry status
                  </p>
                </div>
              </div>
            </div>

            <div className="animate-rise [animation-delay:120ms]">
              <VerificationPanel />
            </div>
          </div>
        </div>
      </header>

      <main>
        <HowItWorks />
        <WhyTrust sampleQrValue={SAMPLE_QR_VALUE} />
      </main>

      <SiteFooter />
    </div>
  );
}
