import { useState, useCallback } from "react";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  LayoutDashboard,
  ShieldCheck,
  FileCheck2,
  Palette,
  Settings,
  LogOut,
  ExternalLink,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { BrandLockup } from "@/components/certifyhub/Brand";
import { supabase } from "@/integrations/supabase/client";
import { getStaffAccess } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

const NAV_ITEMS = [
  {
    label: "Overview",
    to: "/dashboard" as const,
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "Issue Certificate",
    to: "/dashboard/issue" as const,
    icon: ShieldCheck,
    highlight: true,
  },
  {
    label: "Registry",
    to: "/dashboard/certificates" as const,
    icon: FileCheck2,
  },
  {
    label: "Templates",
    to: "/dashboard/templates" as const,
    icon: Palette,
  },
  {
    label: "Settings",
    to: "/dashboard/settings" as const,
    icon: Settings,
  },
];

function DashboardLayout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const fetchAccess = useServerFn(getStaffAccess);
  const access = useQuery({
    queryKey: ["staff-access"],
    queryFn: () => fetchAccess({}),
  });

  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const isAdmin = Boolean(access.data?.isAdmin);
  const canIssue = Boolean(access.data?.isAdmin || access.data?.isIssuer);

  const handleSignOut = useCallback(async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void navigate({ to: "/auth", replace: true });
  }, [navigate, queryClient]);

  const isNavActive = (item: (typeof NAV_ITEMS)[number]) => {
    if (item.exact) {
      return pathname === item.to || pathname === "/dashboard/";
    }
    return pathname.startsWith(item.to);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-gold/20 selection:text-gold-foreground">
      {/* Top Main Navigation Header */}
      <header className="bg-hero-gradient border-b border-primary-foreground/10 sticky top-0 z-40 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 py-3.5">
          {/* Brand lockup */}
          <div className="flex items-center gap-6">
            <Link to="/dashboard" className="transition-opacity hover:opacity-90">
              <BrandLockup onDark />
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5" aria-label="Primary Navigation">
            {NAV_ITEMS.map((item) => {
              const active = isNavActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    active
                      ? "bg-primary-foreground/15 text-primary-foreground shadow-sm"
                      : "text-primary-foreground/75 hover:text-primary-foreground hover:bg-primary-foreground/8"
                  } ${item.highlight && !active ? "border border-gold/30 text-gold hover:text-gold hover:bg-gold/10" : ""}`}
                >
                  <Icon
                    className={`size-4 ${active ? "text-gold" : item.highlight ? "text-gold" : "opacity-80"}`}
                  />
                  <span>{item.label}</span>
                  {active && (
                    <span className="absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-gold rounded-full" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Status & Actions */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-primary-foreground/80">
              <span className="max-w-[150px] truncate text-primary-foreground/70 font-medium">
                {access.data?.email}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${
                  isAdmin
                    ? "border-gold/40 bg-gold/15 text-gold"
                    : canIssue
                      ? "border-emerald/40 bg-emerald/15 text-emerald"
                      : "border-border bg-surface text-muted-foreground"
                }`}
              >
                {isAdmin ? "Admin" : canIssue ? "Issuer" : "Reader"}
              </span>
            </div>

            <div className="h-4 w-px bg-primary-foreground/20" />

            {/* Public verify quick link */}
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-primary-foreground/70 hover:text-primary-foreground transition-colors"
              title="Open public certificate verification portal"
            >
              <span>Verify Portal</span>
              <ExternalLink className="size-3 opacity-70" />
            </Link>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => void handleSignOut()}
              className="h-8 gap-1.5 text-xs bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border border-primary-foreground/15 font-medium"
            >
              <LogOut className="size-3.5" />
              <span>Sign out</span>
            </Button>
          </div>

          {/* Mobile hamburger menu toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                isAdmin
                  ? "border-gold/40 bg-gold/15 text-gold"
                  : canIssue
                    ? "border-emerald/40 bg-emerald/15 text-emerald"
                    : "border-border bg-surface text-muted-foreground"
              }`}
            >
              {isAdmin ? "Admin" : canIssue ? "Issuer" : "Reader"}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="h-9 w-9 p-0 text-primary-foreground hover:bg-primary-foreground/10"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-primary-foreground/10 bg-primary/95 px-4 py-4 space-y-2 backdrop-blur-xl animate-rise">
            <div className="px-3 py-2 text-xs text-primary-foreground/70 border-b border-primary-foreground/10 mb-2">
              Signed in as:{" "}
              <strong className="text-primary-foreground">{access.data?.email}</strong>
            </div>

            {NAV_ITEMS.map((item) => {
              const active = isNavActive(item);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground font-semibold"
                      : "text-primary-foreground/80 hover:bg-primary-foreground/10"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`size-4 ${active ? "text-gold" : "opacity-80"}`} />
                    <span>{item.label}</span>
                  </div>
                  <ChevronRight className="size-4 opacity-50" />
                </Link>
              );
            })}

            <div className="pt-3 mt-3 border-t border-primary-foreground/10 flex items-center justify-between">
              <Link
                to="/"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center gap-1.5 text-xs text-primary-foreground/80 hover:text-primary-foreground"
              >
                <ExternalLink className="size-3.5" />
                <span>Public Verification</span>
              </Link>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => void handleSignOut()}
                className="h-8 gap-1 text-xs"
              >
                <LogOut className="size-3.5" />
                Sign out
              </Button>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        <Outlet />
      </main>

      {/* Authenticated Global Footer */}
      <footer className="border-t border-border bg-card/40 py-6 text-center text-xs text-muted-foreground mt-auto">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald inline-block" />
            <span>WeCertify Official Registry & Issuance Platform</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">
              Overview
            </Link>
            <Link to="/dashboard/issue" className="hover:text-foreground transition-colors">
              Issue
            </Link>
            <Link to="/dashboard/certificates" className="hover:text-foreground transition-colors">
              Registry
            </Link>
            <Link to="/dashboard/templates" className="hover:text-foreground transition-colors">
              Templates
            </Link>
            <Link to="/dashboard/settings" className="hover:text-foreground transition-colors">
              Settings
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
