import { cn } from "@/lib/utils";

export function PageHeader({ title, description, action, className }: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 animate-fade-up", className)}>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-display tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
