import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Zap, Clock, AlertTriangle, ShieldCheck, GitCommit } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useEffect, useState } from "react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { fetchImportedProjects } from "@/lib/imported-projects";
import { listDeployments, listDeploymentStatuses, listPulls, listAllCommits, getCommit } from "@/lib/github/client";
import { useSyncListener } from "@/lib/sync";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/analytics")({
  head: () => ({ meta: [{ title: "Analytics — DevANT" }] }),
  component: Analytics,
});

const tipStyle = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 };

function Analytics() {
  const { user } = useAuth();
  const [trend, setTrend] = useState<any[]>([]);
  const [summary, setSummary] = useState({ deployFrequency: 0, leadTimeHours: 0, changeFailureRate: 0, mttrHours: 0 });
  const [loading, setLoading] = useState(false);
  const [hasData, setHasData] = useState(false);
  const [collaborators, setCollaborators] = useState<Array<{ login: string; avatar: string; commits: number; additions: number; deletions: number }>>([]);
  const [tick, setTick] = useState(0);
  useSyncListener(() => setTick((n) => n + 1));

  function buildTrend() {
    const points: any[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      points.push({ day: d.toISOString().slice(5, 10), deploys: 0, leadTime: 0, failures: 0, mttr: 0 });
    }
    return points;
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) return;
      const projects = await fetchImportedProjects(user.id);
      const token = getGitHubToken(user);
      if (!token || projects.length === 0) {
        setTrend(buildTrend()); setHasData(false); return;
      }
      setLoading(true);
      try {
        const points = buildTrend();
        const idx = new Map(points.map((p, i) => [p.day, i]));
        let deployCount = 0;
        let totalLead = 0, leadN = 0;
        let failCount = 0;

        // Collaborator metrics
        const collabMap = new Map<string, { login: string; avatar: string; commits: number; additions: number; deletions: number }>();

        for (const project of projects) {
          const [deployments, pulls, commits] = await Promise.all([
            listDeployments(token, project.owner, project.repo).catch(() => []),
            listPulls(token, project.owner, project.repo, "closed").catch(() => []),
            listAllCommits(token, project.owner, project.repo, { per_page: 50 }, 200).catch(() => []),
          ]);

          // Compute per-author stats
          const commitDetails = await Promise.all(
            commits.slice(0, 100).map(async (c: any) => {
              try { 
                const d = await getCommit(token, project.owner, project.repo, c.sha); 
                return { c, d }; 
              } catch { 
                return { c, d: null }; 
              }
            })
          );

          for (const { c, d } of commitDetails) {
            const login = c.author?.login ?? c.commit?.author?.name ?? "unknown";
            const avatar = c.author?.avatar_url ?? "";
            let entry = collabMap.get(login);
            if (!entry) {
              entry = { login, avatar, commits: 0, additions: 0, deletions: 0 };
              collabMap.set(login, entry);
            }
            entry.commits += 1;
            entry.additions += d?.stats?.additions ?? 0;
            entry.deletions += d?.stats?.deletions ?? 0;
          }

          for (const d of deployments ?? []) {
            if (!d.created_at) continue;
            const day = String(d.created_at).slice(5, 10);
            const i = idx.get(day);
            if (i !== undefined) points[i].deploys += 1;
            deployCount += 1;
          }
          const merged = (pulls ?? []).filter((p: any) => p.merged_at);
          for (const p of merged) {
            const day = String(p.merged_at).slice(5, 10);
            const start = new Date(p.created_at).getTime();
            const end = new Date(p.merged_at).getTime();
            if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
              const hrs = (end - start) / 3600000;
              totalLead += hrs; leadN += 1;
              const i = idx.get(day);
              if (i !== undefined) points[i].leadTime = Math.max(points[i].leadTime, hrs);
            }
          }
          await Promise.all((deployments ?? []).slice(0, 8).map(async (d: any) => {
            try {
              const st = await listDeploymentStatuses(token, project.owner, project.repo, d.id);
              const s = st?.[0]?.state;
              if (s === "failure" || s === "error") {
                failCount += 1;
                const day = String(d.created_at ?? "").slice(5, 10);
                const i = idx.get(day);
                if (i !== undefined) points[i].failures += 1;
              }
            } catch { /* ignore */ }
          }));
        }

        if (!mounted) return;
        setTrend(points);
        setHasData(deployCount > 0 || leadN > 0);
        setSummary({
          deployFrequency: Math.round((deployCount / 14) * 10) / 10,
          leadTimeHours: leadN > 0 ? Math.round((totalLead / leadN) * 10) / 10 : 0,
          changeFailureRate: deployCount > 0 ? Math.round((failCount / deployCount) * 1000) / 10 : 0,
          mttrHours: 0,
        });

        // Sort collaborators by commits
        const collabArray = Array.from(collabMap.values())
          .sort((a, b) => b.commits - a.commits)
          .slice(0, 10);
        setCollaborators(collabArray);
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [user, tick]);

  return (
    <>
      <PageHeader title="Analytics & DORA" description="Engineering performance over the last 14 days, aggregated across all imported projects." />
      {loading && !hasData ? <div className="glass rounded-xl p-4 mb-4 text-sm text-muted-foreground">Fetching live data…</div> : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Deploy Freq" value={`${summary.deployFrequency}/day`} icon={Zap} accent="success" />
        <StatCard label="Lead Time" value={`${summary.leadTimeHours}h`} icon={Clock} accent="cyan" />
        <StatCard label="Failure Rate" value={`${summary.changeFailureRate}%`} icon={AlertTriangle} accent="warning" />
        <StatCard label="MTTR" value={`${summary.mttrHours}h`} icon={ShieldCheck} accent="primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Chart title="Deployment Frequency"><BarChart data={trend}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} /><YAxis stroke="var(--muted-foreground)" fontSize={11} /><Tooltip contentStyle={tipStyle} /><Bar dataKey="deploys" fill="var(--primary)" radius={[4, 4, 0, 0]} /></BarChart></Chart>
        <Chart title="Lead Time (hours)"><LineChart data={trend}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} /><YAxis stroke="var(--muted-foreground)" fontSize={11} /><Tooltip contentStyle={tipStyle} /><Line type="monotone" dataKey="leadTime" stroke="var(--cyan)" strokeWidth={2} /></LineChart></Chart>
        <Chart title="Change Failure Rate"><LineChart data={trend}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} /><YAxis stroke="var(--muted-foreground)" fontSize={11} /><Tooltip contentStyle={tipStyle} /><Line type="monotone" dataKey="failures" stroke="var(--warning)" strokeWidth={2} /></LineChart></Chart>
        <Chart title="MTTR (hours)"><BarChart data={trend}><CartesianGrid stroke="var(--border)" strokeDasharray="3 3" /><XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} /><YAxis stroke="var(--muted-foreground)" fontSize={11} /><Tooltip contentStyle={tipStyle} /><Bar dataKey="mttr" fill="var(--danger)" radius={[4, 4, 0, 0]} /></BarChart></Chart>
      </div>

      {/* Collaborator metrics */}
      <div className="glass rounded-xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <GitCommit className="size-4 text-primary" />
          <h3 className="font-display font-semibold text-sm">Top Contributors</h3>
        </div>
        {collaborators.length === 0 ? (
          <div className="text-sm text-muted-foreground py-4">No contributor data available. Import projects to see metrics.</div>
        ) : (
          <div className="space-y-2">
            {collaborators.map((collab) => (
              <div key={collab.login} className="flex items-center justify-between p-3 bg-surface/50 rounded-lg hover:bg-surface transition-colors">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={collab.avatar} />
                    <AvatarFallback>{collab.login[0]?.toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold truncate">{collab.login}</div>
                    <div className="text-[10px] text-muted-foreground flex gap-2 flex-wrap">
                      <span>{collab.commits} commits</span>
                      <span className="text-success">+{collab.additions.toLocaleString()}</span>
                      <span className="text-danger">-{collab.deletions.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-xs whitespace-nowrap ml-2">
                  {collab.commits} commits
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactElement }) {
  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-display font-semibold text-sm mb-3">{title}</h3>
      <div style={{ height: 240 }}><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div>
    </div>
  );
}
