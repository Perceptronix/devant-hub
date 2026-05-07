import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "./index";
import { Rocket } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useEffect, useMemo, useState } from "react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { getSelectedImportedProject } from "@/lib/imported-projects";
import { listDeployments, listDeploymentStatuses } from "@/lib/github/client";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/deployments")({
  head: () => ({ meta: [{ title: "Deployments — DevANT" }] }),
  component: Deployments,
});

function Deployments() {
  const envs = ["production", "staging", "preview"] as const;
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

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
        const deployments = await listDeployments(token, selected.owner, selected.repo);
        const recent = (deployments ?? []).slice(0, 20);
        const withStatus = await Promise.all(
          recent.map(async (d: any) => {
            const statuses = await listDeploymentStatuses(token, selected.owner, selected.repo, d.id);
            const latest = Array.isArray(statuses) && statuses.length > 0 ? statuses[0] : null;
            const state = latest?.state ?? d.task ?? "pending";
            const status = state === "success" ? "success" : state === "failure" || state === "error" ? "failure" : "pending";
            return {
              id: String(d.id),
              env: d.environment ?? "preview",
              sha: d.sha ?? "-",
              ref: d.ref ?? "-",
              by: d.creator?.login ?? "unknown",
              time: d.created_at ? formatDistanceToNow(new Date(d.created_at), { addSuffix: true }) : "-",
              status,
            };
          })
        );
        if (!mounted) return;
        setItems(withStatus);
      } catch (err) {
        console.error("Failed to load deployments", err);
        if (!mounted) return;
        setItems([]);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  const byEnv = useMemo(() => {
    return {
      production: items.filter((d) => d.env === "production"),
      staging: items.filter((d) => d.env === "staging"),
      preview: items.filter((d) => d.env !== "production" && d.env !== "staging"),
    };
  }, [items]);

  return (
    <>
      <PageHeader title="Deployments" description="Timeline grouped by environment with budget tracking." />

      {!user ? <div className="glass rounded-xl p-6 mb-6">Sign in and import a project first.</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {envs.map((env) => {
          const used = byEnv[env].length;
          const limit = env === "production" ? 10 : env === "staging" ? 25 : 50;
          return (
            <div key={env} className="glass rounded-xl p-5 animate-fade-up">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{env} budget</span>
                <span className="text-xs font-mono">{used} / {limit}</span>
              </div>
              <Progress value={(used / limit) * 100} className="h-2" />
            </div>
          );
        })}
      </div>

      {envs.map((env) => {
        const envItems = byEnv[env];
        if (envItems.length === 0) return null;
        return (
          <div key={env} className="mb-8">
            <h2 className="font-display font-semibold text-lg mb-3 capitalize">{env}</h2>
            <div className="space-y-2">
              {envItems.map((d) => (
                <div key={d.id} className="glass glass-hover rounded-xl p-4 flex items-center gap-4 animate-fade-up">
                  <div className="size-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><Rocket className="size-5" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs">{d.sha.slice(0, 7)}</code>
                      <span className="text-xs text-muted-foreground">on {d.ref}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">by @{d.by} · {d.time}</div>
                  </div>
                  <StatusBadge status={d.status} />
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}
