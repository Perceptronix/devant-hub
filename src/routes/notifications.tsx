import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { getSelectedImportedProject } from "@/lib/imported-projects";
import { listIssues, listPulls, listDeployments } from "@/lib/github/client";

type NotificationItem = {
  id: string;
  type: "PR" | "Deploy" | "Issue";
  text: string;
  time: string;
  read: boolean;
  timestamp: number;
};

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — DevANT" }] }),
  component: Notifications,
});

function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) {
        setItems([]);
        return;
      }
      const selected = getSelectedImportedProject(user.id);
      const token = getGitHubToken(user);
      if (!selected || !token) {
        setItems([]);
        return;
      }

      try {
        const [pulls, issues, deployments] = await Promise.all([
          listPulls(token, selected.owner, selected.repo, "all"),
          listIssues(token, selected.owner, selected.repo, "all"),
          listDeployments(token, selected.owner, selected.repo),
        ]);

        const prItems: NotificationItem[] = (pulls ?? []).slice(0, 8).map((p: any) => ({
          id: `pr-${p.id}`,
          type: "PR",
          text: `PR #${p.number} ${p.title}`,
          time: p.updated_at ? formatDistanceToNow(new Date(p.updated_at), { addSuffix: true }) : "-",
          read: false,
          timestamp: p.updated_at ? new Date(p.updated_at).getTime() : 0,
        }));

        const issueItems: NotificationItem[] = (issues ?? [])
          .filter((i: any) => !i.pull_request)
          .slice(0, 8)
          .map((i: any) => ({
            id: `issue-${i.id}`,
            type: "Issue",
            text: `Issue #${i.number} ${i.title}`,
            time: i.updated_at ? formatDistanceToNow(new Date(i.updated_at), { addSuffix: true }) : "-",
            read: false,
            timestamp: i.updated_at ? new Date(i.updated_at).getTime() : 0,
          }));

        const deployItems: NotificationItem[] = (deployments ?? []).slice(0, 8).map((d: any) => ({
          id: `deploy-${d.id}`,
          type: "Deploy",
          text: `${d.environment ?? "preview"} deployment on ${d.ref ?? "-"}`,
          time: d.created_at ? formatDistanceToNow(new Date(d.created_at), { addSuffix: true }) : "-",
          read: false,
          timestamp: d.created_at ? new Date(d.created_at).getTime() : 0,
        }));

        const merged = [...prItems, ...issueItems, ...deployItems]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 20);

        if (!mounted) return;
        setItems(merged);
      } catch (err) {
        console.error("Failed to load notifications", err);
        if (!mounted) return;
        setItems([]);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  function markAllRead() {
    setItems((cur) => cur.map((n) => ({ ...n, read: true })));
  }

  return (
    <>
      <PageHeader title="Notifications" action={<Button variant="outline" size="sm" className="gap-1.5" onClick={markAllRead}><Check className="size-4" /> Mark all read</Button>} />
      {!user ? <div className="glass rounded-xl p-6">Sign in and import a project first.</div> : null}
      <div className="space-y-2">
        {user && items.length === 0 ? <div className="glass rounded-xl p-6 text-sm text-muted-foreground">No recent notifications for the selected project yet.</div> : null}
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
