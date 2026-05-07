import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const items = [
  { type: "PR", text: "Bob requested your review on PR #134", time: "2m ago", read: false },
  { type: "Deploy", text: "Production deploy succeeded for neural-core", time: "12m ago", read: false },
  { type: "Issue", text: "New issue #88 opened in studio-ui", time: "1h ago", read: true },
  { type: "Mention", text: "Carol mentioned you in a comment", time: "3h ago", read: true },
];

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — DevANT" }] }),
  component: Notifications,
});

function Notifications() {
  return (
    <>
      <PageHeader title="Notifications" action={<Button variant="outline" size="sm" className="gap-1.5"><Check className="size-4" /> Mark all read</Button>} />
      <div className="space-y-2">
        {items.map((n, i) => (
          <div key={i} className={`glass glass-hover rounded-xl p-4 flex items-start gap-3 animate-fade-up ${!n.read ? "border-primary/30" : ""}`}>
            <div className="size-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><Bell className="size-4" /></div>
            <div className="flex-1">
              <div className="text-sm">{n.text}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{n.type} · {n.time}</div>
            </div>
            {!n.read && <span className="size-2 rounded-full bg-primary mt-2" />}
          </div>
        ))}
      </div>
    </>
  );
}
