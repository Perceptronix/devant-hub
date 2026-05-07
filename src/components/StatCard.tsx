import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown } from "lucide-react";

export function StatCard({ label, value, delta, icon: Icon, accent }: {
  label: string;
  value: number | string;
  delta?: number;
  icon?: React.ComponentType<{ className?: string }>;
  accent?: "primary" | "cyan" | "success" | "warning" | "danger";
}) {
  const [display, setDisplay] = useState(0);
  const numeric = typeof value === "number" ? value : null;

  useEffect(() => {
    if (numeric === null) return;
    let raf = 0;
    const start = performance.now();
    const duration = 800;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(numeric * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [numeric]);

  const accentMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    cyan: "text-cyan bg-cyan/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    danger: "text-danger bg-danger/10",
  };

  return (
    <div className="glass glass-hover rounded-xl p-5 animate-fade-up">
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{label}</div>
        {Icon && (
          <div className={cn("size-8 rounded-lg flex items-center justify-center", accentMap[accent ?? "primary"])}>
            <Icon className="size-4" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-3xl font-display font-bold tracking-tight">
          {numeric === null ? value : display.toLocaleString()}
        </div>
        {typeof delta === "number" && (
          <div className={cn("flex items-center gap-0.5 text-xs", delta >= 0 ? "text-success" : "text-danger")}>
            {delta >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {Math.abs(delta)}%
          </div>
        )}
      </div>
    </div>
  );
}
