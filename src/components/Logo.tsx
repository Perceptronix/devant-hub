import { cn } from "@/lib/utils";

export function Logo({ className, withWordmark = true }: { className?: string; withWordmark?: boolean }) {
  return (
    <div className={cn("flex items-center shrink-0", className)}>
      {withWordmark ? (
        /* Full horizontal lockup — white bg kept, corners rounded via overflow clip */
        <img
          src="/rlogo.svg"
          alt="DevANT"
          height={36}
          className="h-9 w-auto rounded-lg overflow-hidden"
        />
      ) : (
        /* Icon-only (collapsed sidebar) — use the square favicon PNG */
        <img
          src="/favicon-32x32.png"
          alt="DevANT"
          width={28}
          height={28}
          className="rounded-lg"
        />
      )}
    </div>
  );
}
