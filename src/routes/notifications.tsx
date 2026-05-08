import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { fetchImportedProjects } from "@/lib/imported-projects";
import { listIssues, listPulls, listDeployments } from "@/lib/github/client";
import { getReadIds, markRead } from "@/lib/notifications-store";
import { useSyncListener } from "@/lib/sync";

type N = { id: string; type: string; text: string; time: string; read: boolean; ts: number };

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — DevANT" }] }),
  component: Notifications,
});

function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [tick, setTick] = useState(0);
  useSyncListener(() => setTick((n) => n + 1));

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) { setItems([]); return; }
      const projects = await fetchImportedProjects(user.id);
      const token = getGitHubToken(user);
      if (!token || projects.length === 0) { setItems([]); return; }

      const all: N[] = [];
      const read = getReadIds();
      for (const p of projects) {
        const [pulls, issues, deploys] = await Promise.all([
          listPulls(token, p.owner, p.repo, "all").catch(() => []),
          listIssues(token, p.owner, p.repo, "all").catch(() => []),
          listDeployments(token, p.owner, p.repo).catch(() => []),
        ]);
        for (const pr of (pulls ?? []).slice(0, 5)) all.push({ id: `pr-${pr.id}`, type: "PR", text: `${p.repo}: #${pr.number} ${pr.title}`, time: pr.updated_at ? formatDistanceToNow(new Date(pr.updated_at), { addSuffix: true }) : "-", read: read.has(`pr-${pr.id}`), ts: pr.updated_at ? new Date(pr.updated_at).getTime() : 0 });
        for (const i of (issues ?? []).filter((x: any) => !x.pull_request).slice(0, 5)) all.push({ id: `is-${i.id}`, type: "Issue", text: `${p.repo}: #${i.number} ${i.title}`, time: i.updated_at ? formatDistanceToNow(new Date(i.updated_at), { addSuffix: true }) : "-", read: read.has(`is-${i.id}`), ts: i.updated_at ? new Date(i.updated_at).getTime() : 0 });
        for (const d of (deploys ?? []).slice(0, 5)) all.push({ id: `dp-${d.id}`, type: "Deploy", text: `${p.repo}: ${d.environment ?? "preview"} on ${d.ref}`, time: d.created_at ? formatDistanceToNow(new Date(d.created_at), { addSuffix: true }) : "-", read: read.has(`dp-${d.id}`), ts: d.created_at ? new Date(d.created_at).getTime() : 0 });
      }
      if (!mounted) return;
      const sorted = all.sort((a, b) => b.ts - a.ts).slice(0, 30);
      setItems(sorted);
      try { window.localStorage.setItem("devant.notifications.unread", String(sorted.filter((n) => !n.read).length)); } catch { /* noop */ }
      window.dispatchEvent(new CustomEvent("devant:notifications-changed"));
    })();
    return () => { mounted = false; };
  }, [user, tick]);

  function markAll() {
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    if (ids.length === 0) return;
    markRead(ids);
    setItems((cur) => cur.map((n) => ({ ...n, read: true })));
    try { window.localStorage.setItem("devant.notifications.unread", "0"); } catch { /* noop */ }
    window.dispatchEvent(new CustomEvent("devant:notifications-changed"));
  }

  return (
    <>
      <PageHeader title="Notifications" action={<Button variant="outline" size="sm" className="gap-1.5" onClick={markAll}><Check className="size-4" /> Mark all read</Button>} />
      {!user && <div className="glass rounded-xl p-6 text-sm text-muted-foreground">Sign in to view notifications.</div>}
      <div className="space-y-2">
        {user && items.length === 0 && <div className="glass rounded-xl p-6 text-sm text-muted-foreground">No notifications yet.</div>}
        {items.map((n) => (
          <div key={n.id} className={`glass glass-hover rounded-xl p-4 flex items-start gap-3 ${!n.read ? "border-primary/30" : ""}`}>
            <div className="size-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><Bell className="size-4" /></div>
            <div className="flex-1 min-w-0">
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
