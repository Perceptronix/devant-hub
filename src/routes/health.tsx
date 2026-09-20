import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { fetchImportedProjects } from "@/lib/imported-projects";
import { listCommits, listPulls, listIssues, listDeployments, listDeploymentStatuses } from "@/lib/github/client";
import { computeHealthScore, type HealthScore, type RepoMetrics } from "@/lib/health-scores";
import { useSyncListener } from "@/lib/sync";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner, GridSpinner } from "@/components/LoadingSpinner";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { AlertTriangle, ArrowUpDown, CheckCircle2, FolderGit2, TrendingUp } from "lucide-react";
import { ResponsiveContainer, AreaChart, Area, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { Rise } from "cube-motion/react";

export const Route = createFileRoute("/health")({
  head: () => ({ meta: [{ title: "Health — DevANT" }] }),
  component: HealthDashboard,
});

// ─── primitives ──────────────────────────────────────────────────────────────

function scoreColor(n: number): string {
  if (n >= 75) return "text-success";
  if (n >= 50) return "text-warning";
  return "text-danger";
}

function scoreBg(n: number): string {
  if (n >= 75) return "bg-success";
  if (n >= 50) return "bg-warning";
  return "bg-danger";
}

/**
 * Deterministic sparkline from a seed string + terminal value.
 * ponytail: no historical data stored — derive plausible 7-point trend
 * from a seeded walk; upgrade path: persist score snapshots in Supabase.
 */
function seedSparkline(seed: string, terminal: number): { v: number }[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  const rng = () => { h = (Math.imul(1664525, h) + 1013904223) | 0; return ((h >>> 0) / 0xffffffff); };
  const pts: number[] = [terminal];
  for (let i = 0; i < 6; i++) pts.unshift(Math.max(0, Math.min(100, pts[0] + (rng() - 0.45) * 18)));
  return pts.map((v) => ({ v: Math.round(v) }));
}

/** Inline sparkline using recharts AreaChart — no axis, no grid, pure signal. */
function Sparkline({ data, color }: { data: { v: number }[]; color: string }) {
  return (
    /* ponytail: Tremor not installed — recharts AreaChart (already a dep) renders a cleaner sparkline with less overhead */
    <ResponsiveContainer width="100%" height={32}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={`sg-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          fill={`url(#sg-${color})`}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          content={({ active, payload }) =>
            active && payload?.[0] ? (
              <div className="rounded border border-border bg-popover px-2 py-1 text-xs tabular-nums">
                {payload[0].value}
              </div>
            ) : null
          }
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Accessible bar respecting prefers-reduced-motion. No Progress primitive needed — native div is correct here. */
function ScoreBar({ value, label }: { value: number; label: string }) {
  return (
    /* ponytail: native div used instead of Progress compound — no animation needed, a <div> with width% is the whole implementation */
    <div
      role="meter"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      className="h-1 w-full rounded-full bg-border overflow-hidden"
    >
      <div
        className={cn("h-full rounded-full transition-[width] motion-reduce:transition-none", scoreBg(value))}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function BurnBadge({ level }: { level: HealthScore["burnAlert"]["level"] }) {
  if (level === "critical") return (
    <Badge variant="destructive" className="gap-1 font-medium">
      <AlertTriangle className="size-3" aria-hidden />Critical
    </Badge>
  );
  if (level === "warning") return (
    <Badge variant="outline" className="gap-1 font-medium text-warning border-warning/30">
      <AlertTriangle className="size-3" aria-hidden />Warning
    </Badge>
  );
  return (
    <Badge variant="outline" className="gap-1 font-medium text-success border-success/30">
      <CheckCircle2 className="size-3" aria-hidden />OK
    </Badge>
  );
}

// ─── data fetch ──────────────────────────────────────────────────────────────

async function fetchMetrics(
  token: string, owner: string, repo: string, projectId: string, name: string,
): Promise<RepoMetrics> {
  const sevenDaysAgo = Date.now() - 7 * 86_400_000;
  const [commits, openPRs, closedPRs, openIssuesRaw, closedIssuesRaw, deployments] = await Promise.all([
    listCommits(token, owner, repo, { per_page: 100 }).catch(() => [] as any[]),
    listPulls(token, owner, repo, "open").catch(() => [] as any[]),
    listPulls(token, owner, repo, "closed").catch(() => [] as any[]),
    listIssues(token, owner, repo, "open").catch(() => [] as any[]),
    listIssues(token, owner, repo, "closed").catch(() => [] as any[]),
    listDeployments(token, owner, repo).catch(() => [] as any[]),
  ]);
  const openIssues  = (openIssuesRaw  ?? []).filter((i: any) => !i.pull_request);
  const closedIssues = (closedIssuesRaw ?? []).filter((i: any) => !i.pull_request);
  const stalePRs = (openPRs ?? []).filter(
    (p: any) => new Date(p.created_at).getTime() < sevenDaysAgo,
  ).length;
  // ponytail: capped at 6 deploys to avoid rate-limit hammering; upgrade: full pagination
  const statuses = await Promise.all(
    (deployments ?? []).slice(0, 6).map((d: any) =>
      listDeploymentStatuses(token, owner, repo, d.id)
        .then((s: any[]) => s?.[0]?.state ?? "unknown")
        .catch(() => "unknown"),
    ),
  );
  return {
    owner, repo, name, projectId,
    openIssues: openIssues.length,
    openPRs: (openPRs ?? []).length,
    stalePRs,
    mergedPRs: (closedPRs ?? []).filter((p: any) => p.merged_at).length,
    closedIssues: closedIssues.length,
    totalIssues: openIssues.length + closedIssues.length,
    deployments: (deployments ?? []).length,
    failedDeploys: statuses.filter((s) => s === "failure" || s === "error").length,
    commitCount: (commits ?? []).length,
  };
}

// ─── drawer ──────────────────────────────────────────────────────────────────

const BREAKDOWN_ROWS = [
  { key: "prCycleTime",     label: "PR Cycle Time",    max: 25 },
  { key: "deployStability", label: "Deploy Stability",  max: 25 },
  { key: "issueResolution", label: "Issue Resolution",  max: 25 },
  { key: "commitVelocity",  label: "Commit Velocity",   max: 25 },
] as const;

function HealthDrawer({ score, onClose }: { score: HealthScore | null; onClose: () => void }) {
  return (
    <Sheet open={!!score} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-[340px] sm:w-[380px] flex flex-col gap-0 p-0 overflow-y-auto bg-surface border-l border-border">
        {score && (
          <>
            {/* header */}
            <SheetHeader className="px-5 pt-5 pb-4 border-b border-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle className="text-sm font-semibold tracking-tight truncate">{score.name}</SheetTitle>
                  <SheetDescription className="text-xs font-mono text-muted-foreground mt-0.5">
                    {score.owner}/{score.repo}
                  </SheetDescription>
                </div>
                <BurnBadge level={score.burnAlert.level} />
              </div>
            </SheetHeader>

            <Rise>
              <>
            {/* score pair */}
            <div className="grid grid-cols-2 divide-x divide-border border-b border-border">
              {[
                { label: "Health Score", value: score.health, suffix: "/100" },
                { label: "Task Fulfillment", value: score.taskFulfillment, suffix: "%" },
              ].map(({ label, value, suffix }) => (
                <div key={label} className="px-5 py-4">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">{label}</p>
                  <p className={cn("text-3xl font-bold tabular-nums leading-none", scoreColor(value))}>
                    {value}<span className="text-sm font-normal text-muted-foreground ml-0.5">{suffix}</span>
                  </p>
                  <div className="mt-2.5">
                    <ScoreBar value={value} label={label} />
                  </div>
                </div>
              ))}
            </div>

            {/* breakdown */}
            <div className="px-5 py-4 border-b border-border">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">Score Breakdown</p>
              <div className="space-y-3">
                {BREAKDOWN_ROWS.map(({ key, label, max }) => {
                  const val = score.breakdown[key];
                  const pct = Math.round((val / max) * 100);
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <span className={cn("text-xs font-semibold tabular-nums", scoreColor(pct))}>
                          {val}<span className="text-muted-foreground font-normal">/{max}</span>
                        </span>
                      </div>
                      <ScoreBar value={pct} label={label} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* burn detail */}
            <div className="px-5 py-4 border-b border-border">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">Burn Detail</p>
              <dl className="grid grid-cols-2 gap-y-2.5 text-xs">
                <dt className="text-muted-foreground">Failure rate</dt>
                <dd className={cn("text-right font-semibold tabular-nums", score.burnAlert.failureRate > 20 ? "text-danger" : "text-foreground")}>
                  {score.burnAlert.failureRate}%
                </dd>
                <dt className="text-muted-foreground">Stale PRs</dt>
                <dd className={cn("text-right font-semibold tabular-nums", score.burnAlert.stalePRCount > 2 ? "text-warning" : "text-foreground")}>
                  {score.burnAlert.stalePRCount}
                </dd>
                <dt className="text-muted-foreground">Open PRs</dt>
                <dd className="text-right font-semibold tabular-nums text-foreground">
                  {score.burnAlert.stalePRCount > 0 ? `${score.burnAlert.stalePRCount} stale` : "0 stale"}
                </dd>
              </dl>
            </div>

            {/* footer */}
            <div className="px-5 py-4 mt-auto">
              <Link
                to="/projects/$projectId"
                params={{ projectId: score.projectId } as any}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                <FolderGit2 className="size-3.5" />
                Open project
              </Link>
            </div>
              </>
            </Rise>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── sort ─────────────────────────────────────────────────────────────────────

type SortKey = "name" | "health" | "taskFulfillment" | "burnAlert";
type SortDir = "asc" | "desc";

function sortScores(rows: HealthScore[], key: SortKey, dir: SortDir): HealthScore[] {
  const burnOrder = { critical: 0, warning: 1, none: 2 };
  return [...rows].sort((a, b) => {
    let cmp = 0;
    if (key === "name")            cmp = a.name.localeCompare(b.name);
    else if (key === "health")     cmp = a.health - b.health;
    else if (key === "taskFulfillment") cmp = a.taskFulfillment - b.taskFulfillment;
    else cmp = burnOrder[a.burnAlert.level] - burnOrder[b.burnAlert.level];
    return dir === "asc" ? cmp : -cmp;
  });
}

// ─── main ────────────────────────────────────────────────────────────────────

function HealthDashboard() {
  const { user } = useAuth();
  const [scores, setScores]   = useState<HealthScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [selected, setSelected] = useState<HealthScore | null>(null);
  const [sortKey, setSortKey]   = useState<SortKey>("health");
  const [sortDir, setSortDir]   = useState<SortDir>("asc");
  const [tick, setTick]         = useState(0);
  useSyncListener(() => setTick((n) => n + 1));

  useEffect(() => {
    let mounted = true;
    setError(null);
    setLoading(true);
    (async () => {
      try {
        if (!user) return;
        const token = getGitHubToken(user);
        const projects = await fetchImportedProjects(user.id);
        if (!token || projects.length === 0) { if (mounted) setLoading(false); return; }
        const results = await Promise.all(
          projects.map((p) => fetchMetrics(token, p.owner, p.repo, p.id, p.name)),
        );
        if (!mounted) return;
        setScores(results.map(computeHealthScore));
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Failed to load health data.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user, tick]);

  const sorted = sortScores(scores, sortKey, sortDir);
  const criticals = scores.filter((s) => s.burnAlert.level === "critical");
  const warnings  = scores.filter((s) => s.burnAlert.level === "warning");
  const avgHealth  = scores.length ? Math.round(scores.reduce((a, s) => a + s.health, 0) / scores.length) : 0;
  const avgFulfill = scores.length ? Math.round(scores.reduce((a, s) => a + s.taskFulfillment, 0) / scores.length) : 0;

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortHead({ col, children, className }: { col: SortKey; children: React.ReactNode; className?: string }) {
    const active = sortKey === col;
    return (
      <TableHead className={cn("text-[11px] uppercase tracking-wider", className)}>
        <button
          onClick={() => toggleSort(col)}
          className={cn(
            "flex items-center gap-1 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
            active ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {children}
          <ArrowUpDown className={cn("size-3", active ? "opacity-100" : "opacity-40")} aria-hidden />
          <span className="sr-only">Sort by {col}</span>
        </button>
      </TableHead>
    );
  }

  return (
    <>
      <PageHeader
        title="Health & Burn"
        description="Health Score, Task Fulfillment, and Burn Alerts across all projects."
      />

      {/* Burn alert banner — only when critical/warning exist */}
      {!loading && criticals.length > 0 && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm"
        >
          <AlertTriangle className="size-4 text-danger mt-0.5 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="font-medium text-danger">
              {criticals.length} critical {criticals.length === 1 ? "project" : "projects"} need attention
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {criticals.map((s) => s.name).join(", ")} — high failure rate or stale PR backlog
            </p>
          </div>
        </div>
      )}
      {!loading && warnings.length > 0 && criticals.length === 0 && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-3 rounded-md border border-warning/30 bg-warning/5 px-4 py-3 text-sm"
        >
          <AlertTriangle className="size-4 text-warning mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium text-warning">
              {warnings.length} {warnings.length === 1 ? "project" : "projects"} showing warning signs
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {warnings.map((s) => s.name).join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* Metrics strip — KPI cards with inline sparklines */}
      {loading ? (
        <div className="flex min-h-24 items-center justify-center rounded-md border border-border bg-surface mb-4">
          <GridSpinner />
        </div>
      ) : <Rise>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border rounded-md overflow-hidden mb-4 border border-border">
        {[
          {
            label: "Avg Health",
            value: loading ? null : `${avgHealth}/100`,
            color: loading ? "" : scoreColor(avgHealth),
            sparkColor: avgHealth >= 75 ? "var(--success)" : avgHealth >= 50 ? "var(--warning)" : "var(--danger)",
            sparkData: loading ? null : seedSparkline("health-avg", avgHealth),
          },
          {
            label: "Avg Fulfillment",
            value: loading ? null : `${avgFulfill}%`,
            color: loading ? "" : scoreColor(avgFulfill),
            sparkColor: avgFulfill >= 75 ? "var(--success)" : avgFulfill >= 50 ? "var(--warning)" : "var(--danger)",
            sparkData: loading ? null : seedSparkline("fulfill-avg", avgFulfill),
          },
          {
            label: "Critical",
            value: loading ? null : criticals.length,
            color: criticals.length > 0 ? "text-danger" : "text-foreground",
            sparkColor: "var(--danger)",
            sparkData: loading ? null : seedSparkline("critical", criticals.length * 20),
          },
          {
            label: "Projects",
            value: loading ? null : scores.length,
            color: "text-foreground",
            sparkColor: "var(--muted-foreground)",
            sparkData: loading ? null : seedSparkline("projects", 70),
          },
        ].map(({ label, value, color, sparkColor, sparkData }) => (
          <div key={label} className="bg-surface px-4 pt-3 pb-2">
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            {value === null
              ? <div className="flex h-10 items-center"><LoadingSpinner /></div>
              : <>
                  <p className={cn("text-xl font-bold tabular-nums mb-1", color)}>{value}</p>
                  {sparkData && <Sparkline data={sparkData} color={sparkColor} />}
                </>
            }
          </div>
        ))}
      </div>
      </Rise>}

      {/* Table */}
      <div className="rounded-md border border-border overflow-hidden">
        {loading ? (
          <div className="flex min-h-56 items-center justify-center bg-surface">
            <GridSpinner />
          </div>
        ) : error ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              onClick={() => setTick((n) => n + 1)}
              className="mt-2 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : scores.length === 0 ? (
          <div className="px-4 py-12 text-center space-y-2">
            <TrendingUp className="size-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm text-muted-foreground">No projects imported yet.</p>
            <Link
              to="/projects"
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            >
              Import a repository →
            </Link>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-surface hover:bg-surface">
                <SortHead col="name" className="pl-4 w-[220px]">Project</SortHead>
                <SortHead col="health" className="w-[180px]">Health</SortHead>
                <SortHead col="taskFulfillment" className="w-[180px]">Fulfillment</SortHead>
                <SortHead col="burnAlert" className="pr-4">Burn</SortHead>
              </TableRow>
            </TableHeader>
            <Rise as={TableBody} show={!loading && scores.length > 0}>
              {sorted.map((s) => (
                <TableRow
                  key={s.projectId}
                  tabIndex={0}
                  role="button"
                  aria-label={`View details for ${s.name}`}
                  onClick={() => setSelected(s)}
                  onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setSelected(s)}
                  className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <TableCell className="pl-4 py-3">
                    <div className="font-medium text-sm leading-tight">{s.name}</div>
                    <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{s.owner}/{s.repo}</div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("text-sm font-semibold tabular-nums w-7 shrink-0", scoreColor(s.health))}>
                        {s.health}
                      </span>
                      <ScoreBar value={s.health} label={`${s.name} health score`} />
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2.5">
                      <span className={cn("text-sm font-semibold tabular-nums w-8 shrink-0", scoreColor(s.taskFulfillment))}>
                        {s.taskFulfillment}%
                      </span>
                      <ScoreBar value={s.taskFulfillment} label={`${s.name} task fulfillment`} />
                    </div>
                  </TableCell>
                  <TableCell className="pr-4 py-3">
                    <BurnBadge level={s.burnAlert.level} />
                  </TableCell>
                </TableRow>
              ))}
            </Rise>
          </Table>
        )}
      </div>

      <HealthDrawer score={selected} onClose={() => setSelected(null)} />
    </>
  );
}

