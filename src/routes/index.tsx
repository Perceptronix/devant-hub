import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { FolderGit2, GitPullRequest, Bug, Rocket, Users, GitCommit, Activity, Zap, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { demoActivity, demoCommits, demoMetrics, demoTeam, demoDeployments } from "@/lib/demo-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — DevANT" }] }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <>
      <PageHeader title="Dashboard" description="Real-time overview of your engineering org." />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <StatCard label="Projects" value={5} icon={FolderGit2} accent="primary" delta={12} />
        <StatCard label="Open PRs" value={13} icon={GitPullRequest} accent="cyan" delta={-4} />
        <StatCard label="Open Issues" value={42} icon={Bug} accent="warning" delta={8} />
        <StatCard label="Deploys / week" value={29} icon={Rocket} accent="success" delta={22} />
        <StatCard label="Contributors" value={6} icon={Users} accent="primary" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* DORA */}
        <div className="xl:col-span-2 glass rounded-xl p-5 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg">DORA Metrics</h2>
            <Badge variant="outline" className="text-xs">Last 14 days</Badge>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
            <DoraTile icon={Zap} label="Deploy Freq" value={`${demoMetrics.deployFrequency}/day`} accent="success" />
            <DoraTile icon={Clock} label="Lead Time" value={`${demoMetrics.leadTimeHours}h`} accent="cyan" />
            <DoraTile icon={AlertTriangle} label="Change Failure" value={`${demoMetrics.changeFailureRate}%`} accent="warning" />
            <DoraTile icon={ShieldCheck} label="MTTR" value={`${demoMetrics.mttrHours}h`} accent="primary" />
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demoMetrics.trend}>
                <CartesianGrid stroke="oklch(0.27 0.02 280)" strokeDasharray="3 3" />
                <XAxis dataKey="day" stroke="oklch(0.62 0.04 280)" fontSize={11} />
                <YAxis stroke="oklch(0.62 0.04 280)" fontSize={11} />
                <Tooltip contentStyle={{ background: "oklch(0.16 0.02 280)", border: "1px solid oklch(0.27 0.02 280)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="deploys" stroke="oklch(0.62 0.22 285)" strokeWidth={2} dot={false} name="Deploys" />
                <Line type="monotone" dataKey="leadTime" stroke="oklch(0.78 0.18 220)" strokeWidth={2} dot={false} name="Lead Time" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity feed */}
        <div className="glass rounded-xl p-5 animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg">Activity</h2>
            <span className="flex items-center gap-1.5 text-[10px] text-success"><span className="size-1.5 rounded-full bg-success animate-pulse" /> LIVE</span>
          </div>
          <div className="space-y-3">
            {demoActivity.map((a, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <Activity className="size-4 mt-0.5 shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  <div className="text-foreground">{a.text}</div>
                  <div className="text-xs text-muted-foreground truncate">{a.detail}</div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent commits */}
        <div className="xl:col-span-2 glass rounded-xl p-5 animate-fade-up">
          <h2 className="font-display font-semibold text-lg mb-4">Recent Commits</h2>
          <div className="space-y-2">
            {demoCommits.slice(0, 5).map((c) => (
              <Link key={c.sha} to="/commits/$sha" params={{ sha: c.sha }} className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-elevated transition-colors">
                <Avatar className="size-7"><AvatarImage src={c.avatar} /><AvatarFallback>{c.author[0]}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.message}</div>
                  <div className="text-xs text-muted-foreground">@{c.author} · {c.branch}</div>
                </div>
                <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-surface text-muted-foreground">{c.sha.slice(0, 7)}</code>
              </Link>
            ))}
          </div>
        </div>

        {/* Top contributors */}
        <div className="glass rounded-xl p-5 animate-fade-up">
          <h2 className="font-display font-semibold text-lg mb-4">Top Contributors</h2>
          <div className="space-y-3">
            {[demoTeam.owner, ...demoTeam.collaborators].map((m) => (
              <div key={m.login} className="flex items-center gap-3">
                <Avatar className="size-8"><AvatarImage src={m.avatar} /><AvatarFallback>{m.name[0]}</AvatarFallback></Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.name}</div>
                  <div className="text-xs text-muted-foreground">@{m.login}</div>
                </div>
                <div className="text-xs font-mono text-success">{m.contrib}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Deployments timeline */}
        <div className="xl:col-span-3 glass rounded-xl p-5 animate-fade-up">
          <h2 className="font-display font-semibold text-lg mb-4">Recent Deployments</h2>
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground uppercase">
                  <th className="py-2 pr-4">Env</th><th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4">SHA</th><th className="py-2 pr-4">Ref</th>
                  <th className="py-2 pr-4">By</th><th className="py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {demoDeployments.map((d) => (
                  <tr key={d.id} className="border-t border-border hover:bg-surface-elevated/50">
                    <td className="py-2 pr-4"><Badge variant="outline" className="capitalize">{d.env}</Badge></td>
                    <td className="py-2 pr-4"><StatusBadge status={d.status} /></td>
                    <td className="py-2 pr-4 font-mono text-xs">{d.sha.slice(0, 7)}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{d.ref}</td>
                    <td className="py-2 pr-4">@{d.by}</td>
                    <td className="py-2 text-muted-foreground">{d.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function DoraTile({ icon: Icon, label, value, accent }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; accent: "primary" | "cyan" | "success" | "warning" }) {
  const map = { primary: "text-primary", cyan: "text-cyan", success: "text-success", warning: "text-warning" };
  return (
    <div className="rounded-lg border border-border bg-surface-elevated p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground uppercase tracking-wider"><Icon className={`size-3 ${map[accent]}`} />{label}</div>
      <div className="font-display font-bold text-xl mt-1">{value}</div>
    </div>
  );
}

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
