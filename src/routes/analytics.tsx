import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Zap, Clock, AlertTriangle, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useEffect, useState } from "react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { getSelectedImportedProject } from "@/lib/imported-projects";
import { getSupabase } from "@/integrations/supabase/client";
import { listContributors, listDeployments, listDeploymentStatuses, listPulls } from "@/lib/github/client";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — DevANT" }] }),
  component: Analytics,
});
const tipStyle = { background: "oklch(0.16 0.02 280)", border: "1px solid oklch(0.27 0.02 280)", borderRadius: 8, fontSize: 12 };

function Analytics() {
  const { user } = useAuth();
  const [trend, setTrend] = useState<any[]>([]);
  const [summary, setSummary] = useState({ deployFrequency: 0, leadTimeHours: 0, changeFailureRate: 0, mttrHours: 0 });
  const [board, setBoard] = useState<any[]>([]);

  function buildFallbackTrend() {
    const points: Array<{ day: string; deploys: number; leadTime: number; failures: number; mttr: number }> = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      points.push({ day: d.toISOString().slice(0, 10), deploys: 0, leadTime: 0, failures: 0, mttr: 0 });
    }
    return points;
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) return;
      const selected = getSelectedImportedProject(user.id);
      if (!selected) return;
      const supabase = getSupabase();

      try {
        // DORA metrics
        const { data: dora, error: doraErr } = await supabase
          .from("dora_metrics")
          .select("period_start, deployment_frequency, lead_time_hours, change_failure_rate, mean_time_to_restore_hours")
          .eq("project_id", selected.id)
          .order("period_start", { ascending: true });
        if (doraErr) throw doraErr;
        const t = (dora ?? []).map((r: any) => ({ day: r.period_start, deploys: r.deployment_frequency, leadTime: r.lead_time_hours, failures: r.change_failure_rate, mttr: r.mean_time_to_restore_hours }));
        if (!mounted) return;
        setTrend(t);
        if (t.length > 0) {
          const last = t[t.length - 1];
          setSummary({ deployFrequency: last.deploys ?? 0, leadTimeHours: last.leadTime ?? 0, changeFailureRate: last.failures ?? 0, mttrHours: last.mttr ?? 0 });
        } else {
          const token = getGitHubToken(user);
          if (token) {
            const [deployments, pulls] = await Promise.all([
              listDeployments(token, selected.owner, selected.repo),
              listPulls(token, selected.owner, selected.repo, "closed"),
            ]);

            const points = buildFallbackTrend();
            const idx = new Map(points.map((p, i) => [p.day, i]));

            for (const d of deployments ?? []) {
              if (!d.created_at) continue;
              const day = String(d.created_at).slice(0, 10);
              const i = idx.get(day);
              if (i === undefined) continue;
              points[i].deploys += 1;
            }

            const mergedPulls = (pulls ?? []).filter((p: any) => Boolean(p.merged_at));
            for (const p of mergedPulls) {
              const day = String(p.merged_at).slice(0, 10);
              const i = idx.get(day);
              if (i === undefined) continue;
              const start = new Date(p.created_at).getTime();
              const end = new Date(p.merged_at).getTime();
              if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
                const leadHrs = (end - start) / (1000 * 60 * 60);
                points[i].leadTime = points[i].leadTime === 0 ? leadHrs : Math.round(((points[i].leadTime + leadHrs) / 2) * 10) / 10;
              }
            }

            const failureDeployIds = new Set<number>();
            await Promise.all(
              (deployments ?? []).slice(0, 10).map(async (d: any) => {
                try {
                  const statuses = await listDeploymentStatuses(token, selected.owner, selected.repo, d.id);
                  const latest = statuses?.[0]?.state;
                  if (latest === "failure" || latest === "error") {
                    failureDeployIds.add(d.id);
                    const day = String(d.created_at ?? "").slice(0, 10);
                    const i = idx.get(day);
                    if (i !== undefined) {
                      points[i].failures += 1;
                    }
                  }
                } catch {
                  // ignore per-deployment status failure
                }
              })
            );

            setTrend(points);
            const deployCount = deployments?.length ?? 0;
            const totalLead = mergedPulls.reduce((acc: number, p: any) => {
              const start = new Date(p.created_at).getTime();
              const end = new Date(p.merged_at).getTime();
              if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return acc;
              return acc + (end - start) / (1000 * 60 * 60);
            }, 0);
            setSummary({
              deployFrequency: Math.round((deployCount / 14) * 10) / 10,
              leadTimeHours: mergedPulls.length > 0 ? Math.round((totalLead / mergedPulls.length) * 10) / 10 : 0,
              changeFailureRate: deployCount > 0 ? Math.round((failureDeployIds.size / deployCount) * 1000) / 10 : 0,
              mttrHours: 0,
            });
          }
        }

        // Contributor leaderboard
        const { data: team, error: teamErr } = await supabase.from("project_team_members").select("github_login, name, avatar_url, contributions_count, lines_added, lines_removed").eq("project_id", selected.id);
        if (teamErr) throw teamErr;
        const b = (team ?? []).map((m: any) => ({ login: m.github_login, name: m.name ?? m.github_login, avatar: m.avatar_url, contrib: m.contributions_count ?? 0, add: m.lines_added ?? 0, del: m.lines_removed ?? 0 }));
        if (b.length === 0) {
          const token = getGitHubToken(user);
          if (token) {
            const contribs = await listContributors(token, selected.owner, selected.repo);
            b.push(
              ...(contribs ?? []).map((m: any) => ({
                login: m.login,
                name: m.login,
                avatar: m.avatar_url,
                contrib: m.contributions ?? 0,
                add: 0,
                del: 0,
              }))
            );
          }
        }
        if (!mounted) return;
        setBoard(b.sort((a: any, b: any) => b.contrib - a.contrib));
      } catch (err) {
        console.error("Failed to load analytics data", err);
      }
    }
    load();
    return () => { mounted = false; };
  }, [user]);

  if (!user) {
    return (
      <>
        <PageHeader title="Analytics & DORA" description="Sign in and import a project to view analytics." />
        <div className="glass rounded-xl p-6">Sign in and import a project first.</div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Analytics & DORA" description="Engineering performance over the last 14 days." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Deploy Freq" value={`${summary.deployFrequency}/day`} icon={Zap} accent="success" />
        <StatCard label="Lead Time" value={`${summary.leadTimeHours}h`} icon={Clock} accent="cyan" />
        <StatCard label="Failure Rate" value={`${summary.changeFailureRate}%`} icon={AlertTriangle} accent="warning" />
        <StatCard label="MTTR" value={`${summary.mttrHours}h`} icon={ShieldCheck} accent="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Chart title="Deployment Frequency" h={240}>
          <BarChart data={trend}>
            <CartesianGrid stroke="oklch(0.27 0.02 280)" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <YAxis stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <Tooltip contentStyle={tipStyle} />
            <Bar dataKey="deploys" fill="oklch(0.62 0.22 285)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </Chart>
        <Chart title="Lead Time (hours)" h={240}>
          <LineChart data={trend}>
            <CartesianGrid stroke="oklch(0.27 0.02 280)" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <YAxis stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <Tooltip contentStyle={tipStyle} />
            <Line type="monotone" dataKey="leadTime" stroke="oklch(0.78 0.18 220)" strokeWidth={2} />
          </LineChart>
        </Chart>
        <Chart title="Change Failure Rate (%)" h={240}>
          <LineChart data={trend}>
            <CartesianGrid stroke="oklch(0.27 0.02 280)" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <YAxis stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <Tooltip contentStyle={tipStyle} />
            <Line type="monotone" dataKey="failures" stroke="oklch(0.82 0.18 80)" strokeWidth={2} />
          </LineChart>
        </Chart>
        <Chart title="MTTR (hours)" h={240}>
          <BarChart data={trend}>
            <CartesianGrid stroke="oklch(0.27 0.02 280)" strokeDasharray="3 3" />
            <XAxis dataKey="day" stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <YAxis stroke="oklch(0.62 0.04 280)" fontSize={11} />
            <Tooltip contentStyle={tipStyle} />
            <Bar dataKey="mttr" fill="oklch(0.65 0.24 18)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </Chart>
      </div>

      <div className="glass rounded-xl p-5 animate-fade-up">
        <h2 className="font-display font-semibold text-lg mb-4">Contributor Leaderboard</h2>
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground uppercase">
            <th className="py-2">Member</th><th className="py-2 text-right">Commits</th>
            <th className="py-2 text-right">+Lines</th><th className="py-2 text-right">-Lines</th>
          </tr></thead>
          <tbody>
            {board.map((m) => (
              <tr key={m.login} className="border-t border-border">
                <td className="py-2.5 flex items-center gap-2">
                  <Avatar className="size-6"><AvatarImage src={m.avatar} /><AvatarFallback>{m.name[0]}</AvatarFallback></Avatar>
                  <span>@{m.login}</span>
                </td>
                <td className="py-2.5 text-right font-mono">{m.contrib}</td>
                <td className="py-2.5 text-right font-mono text-success">+{m.add.toLocaleString()}</td>
                <td className="py-2.5 text-right font-mono text-danger">-{m.del.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Chart({ title, h, children }: { title: string; h: number; children: React.ReactElement }) {
  return (
    <div className="glass rounded-xl p-5 animate-fade-up">
      <h3 className="font-display font-semibold text-sm mb-3">{title}</h3>
      <div style={{ height: h }}>
        <ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer>
      </div>
    </div>
  );
}
