export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "bg-success/15 text-success border-success/30",
    failure: "bg-danger/15 text-danger border-danger/30",
    pending: "bg-warning/15 text-warning border-warning/30",
    in_progress: "bg-cyan/15 text-cyan border-cyan/30 animate-pulse",
    open: "bg-success/15 text-success border-success/30",
    merged: "bg-primary/15 text-primary border-primary/30",
    closed: "bg-danger/15 text-danger border-danger/30",
  };
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded border ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
