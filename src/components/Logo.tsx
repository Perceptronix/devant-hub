import { cn } from "@/lib/utils";

export function Logo({ className, withWordmark = true }: { className?: string; withWordmark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="devant-g" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stopColor="oklch(0.62 0.22 285)" />
            <stop offset="1" stopColor="oklch(0.78 0.18 220)" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="28" height="28" rx="8" fill="url(#devant-g)" />
        <path d="M10 22V10h5.5c3.6 0 6 2.3 6 6s-2.4 6-6 6H10zm3-3h2.4c1.7 0 2.9-1.2 2.9-3s-1.2-3-2.9-3H13v6z" fill="oklch(0.99 0 0)" />
      </svg>
      {withWordmark && (
        <span className="font-display font-bold text-lg tracking-tight">
          Dev<span className="text-gradient">ANT</span>
        </span>
      )}
    </div>
  );
}
