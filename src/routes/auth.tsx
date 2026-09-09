import { useEffect, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { Loader2, Lock, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandLockup } from "@/components/certifyhub/Brand";
import { supabase } from "@/integrations/supabase/client";

const TITLE = "Staff sign in — WeCertify by Weskill";
const DESCRIPTION =
  "Sign in to WeCertify to issue and manage Weskill certificates. Verifying a certificate never requires an account.";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError) {
      setError("That email and password combination doesn't match our records.");
      setBusy(false);
      return;
    }
    void navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-hero-gradient">
      <header className="mx-auto w-full max-w-6xl px-6 py-5">
        <Link to="/">
          <BrandLockup onDark />
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-16">
        <div className="animate-rise rounded-3xl border border-border/80 bg-card/95 p-6 shadow-lift backdrop-blur sm:p-8">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <ShieldCheck className="size-4 text-emerald" />
            Staff access
          </div>
          <h1 className="mt-4 font-display text-2xl font-semibold text-foreground">
            Sign in to issue certificates
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            For Weskill administrators and issuers only. Anyone can verify a certificate without an
            account.
          </p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@weskill.org"
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>
            {error && (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="h-11 w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
              Sign in
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            <Link to="/" className="font-medium text-foreground underline-offset-4 hover:underline">
              Back to certificate verification
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
