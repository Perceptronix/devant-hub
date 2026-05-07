import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { demoDeployments } from "@/lib/demo-data";
import { StatusBadge } from "./index";
import { Rocket } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/deployments")({
  head: () => ({ meta: [{ title: "Deployments — DevANT" }] }),
  component: Deployments,
});

function Deployments() {
  const envs = ["production", "staging", "preview"] as const;

  return (
    <>
      <PageHeader title="Deployments" description="Timeline grouped by environment with budget tracking." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {envs.map((env) => {
          const used = demoDeployments.filter((d) => d.env === env).length;
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
        const items = demoDeployments.filter((d) => d.env === env);
        if (items.length === 0) return null;
        return (
          <div key={env} className="mb-8">
            <h2 className="font-display font-semibold text-lg mb-3 capitalize">{env}</h2>
            <div className="space-y-2">
              {items.map((d) => (
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
