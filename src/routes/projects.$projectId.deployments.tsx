import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Rocket } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { useProject } from "@/lib/use-project";
import { listDeployments, listDeploymentStatuses } from "@/lib/github/client";
import { formatDistanceToNow } from "date-fns";
import { StatusBadge } from "@/components/StatusBadge";
import { useSyncListener } from "@/lib/sync";

export const Route = createFileRoute("/projects/$projectId/deployments")({
  component: Deployments,
});

function Deployments() {
  const { projectId } = useParams({ from: "/projects/$projectId/deployments" });
  const { project } = useProject(projectId);
  const { user } = useAuth();
  const envs = ["production", "staging", "preview"] as const;
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  useSyncListener(() => setTick((n) => n + 1));

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user || !project) return;
      const token = getGitHubToken(user);
      if (!token) return;
      setLoading(true);
      try {
        const deployments = await listDeployments(token, project.owner, project.repo);
        const recent = (deployments ?? []).slice(0, 20);
        const withStatus = await Promise.all(recent.map(async (d: any) => {
          const statuses = await listDeploymentStatuses(token, project.owner, project.repo, d.id).catch(() => []);
          const latest = Array.isArray(statuses) && statuses.length > 0 ? statuses[0] : null;
          const state = latest?.state ?? "pending";
          const status = state === "success" ? "success" : state === "failure" || state === "error" ? "failure" : "pending";
          return {
            id: String(d.id), env: d.environment ?? "preview",
            sha: d.sha ?? "-", ref: d.ref ?? "-",
            by: d.creator?.login ?? "unknown",
            time: d.created_at ? formatDistanceToNow(new Date(d.created_at), { addSuffix: true }) : "-",
            status,
          };
        }));
        if (!mounted) return;
        setItems(withStatus);
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [user, project, tick]);

  const byEnv = useMemo(() => ({
    production: items.filter((d) => d.env === "production"),
    staging: items.filter((d) => d.env === "staging"),
    preview: items.filter((d) => d.env !== "production" && d.env !== "staging"),
  }), [items]);

  return (
    <>
      <h1 className="text-2xl font-display font-bold mb-4">Deployments</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {envs.map((env) => {
          const used = byEnv[env].length;
          const limit = env === "production" ? 10 : env === "staging" ? 25 : 50;
          return (
            <div key={env} className="glass rounded-xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{env}</span>
                <span className="text-xs font-mono">{used} / {limit}</span>
              </div>
              <Progress value={(used / limit) * 100} className="h-2" />
            </div>
          );
        })}
      </div>
      {loading ? <div className="glass rounded-xl p-6 text-sm text-muted-foreground">Loading…</div> :
        items.length === 0 ? <div className="glass rounded-xl p-6 text-sm text-muted-foreground">No deployments.</div> :
        envs.map((env) => byEnv[env].length === 0 ? null : (
          <div key={env} className="mb-8">
            <h2 className="font-display font-semibold text-lg mb-3 capitalize">{env}</h2>
            <div className="space-y-2">
              {byEnv[env].map((d) => (
                <div key={d.id} className="glass glass-hover rounded-xl p-4 flex items-center gap-4">
                  <div className="size-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><Rocket className="size-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2"><code className="font-mono text-xs">{d.sha.slice(0, 7)}</code><span className="text-xs text-muted-foreground">on {d.ref}</span></div>
                    <div className="text-xs text-muted-foreground">by @{d.by} · {d.time}</div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          </div>
        ))
      }
    </>
  );
}
