import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold-gradient shadow-gold",
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-5 text-gold-foreground" fill="none">
        <path
          d="M12 2.5 4.5 5.6v6.1c0 4.5 3.1 8.4 7.5 9.8 4.4-1.4 7.5-5.3 7.5-9.8V5.6L12 2.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path
          d="m8.6 12.1 2.3 2.3 4.5-4.6"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function BrandLockup({
  className,
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <BrandMark />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display text-lg font-semibold tracking-tight",
            onDark ? "text-primary-foreground" : "text-foreground",
          )}
        >
          Certify<span className="text-gold">Hub</span>
        </span>
        <span
          className={cn(
            "mt-1 text-[0.68rem] font-medium uppercase tracking-[0.22em]",
            onDark ? "text-primary-foreground/60" : "text-muted-foreground",
          )}
        >
          by Weskill
        </span>
      </span>
    </span>
  );
}
