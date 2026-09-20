import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, GitCommit, GitPullRequest, Bug, Rocket, FolderGit2, Activity, ArrowRight } from "lucide-react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { fetchImportedProjects, type ImportedProject } from "@/lib/imported-projects";
import { listCommits, listPulls, listIssues, listDeployments } from "@/lib/github/client";
import { useSyncListener } from "@/lib/sync";
import { useCurrentOrg } from "@/lib/current-org";
import { LoadingSpinner, GridSpinner } from "@/components/LoadingSpinner";
import { Rise } from "cube-motion/react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [{ title: "Dashboard — DevANT" }],
  }),
  component: DashboardRoute,
});

function DashboardRoute() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/", replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <DashboardView user={user} />;
}

function DashboardView({ user }: { user: any }) {
  const { currentOrg } = useCurrentOrg();
  const [projects, setProjects] = useState<ImportedProject[]>([]);
  const [stats, setStats] = useState({ commits: 0, prs: 0, issues: 0, deploys: 0 });
  const [loading, setLoading] = useState(false);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [tick, setTick] = useState(0);
  useSyncListener(() => setTick((n) => n + 1));

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) {
        setProjects([]);
        setProjectsLoading(false);
        return;
      }
      const all = await fetchImportedProjects(user.id);
      const list = currentOrg
        ? all.filter((p) => !p.org_id || p.org_id === currentOrg.id)
        : all;
      if (!mounted) return;
      setProjects(list);
      setProjectsLoading(false);
      const token = getGitHubToken(user);
      if (!token || list.length === 0) return;
      setLoading(true);
      try {
        let commits = 0,
          prs = 0,
          issues = 0,
          deploys = 0;
        await Promise.all(
          list.map(async (p) => {
            const [c, pr, is, dp] = await Promise.all([
              listCommits(token, p.owner, p.repo, { per_page: 100 }).catch(() => []),
              listPulls(token, p.owner, p.repo, "open").catch(() => []),
              listIssues(token, p.owner, p.repo, "open").catch(() => []),
              listDeployments(token, p.owner, p.repo).catch(() => []),
            ]);
            commits += c.length;
            prs += pr.length;
            issues += (is ?? []).filter((i: any) => !i.pull_request).length;
            deploys += dp.length;
          }),
        );
        if (mounted) setStats({ commits, prs, issues, deploys });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user, tick, currentOrg?.id]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  })();
  const firstName =
    ((user?.user_metadata as any)?.full_name || user?.email || "there").split(" ")[0]?.split("@")[0] ?? "there";

  return (
    <div className="space-y-8">
      {/* Hero */}
      <Rise>
        <div className="relative overflow-hidden rounded-[28px] border border-border bg-gradient-to-br from-primary/15 via-surface/60 to-cyan/10 p-8 shadow-lg">
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-52 w-52 rounded-full bg-cyan/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-primary font-semibold">
                {currentOrg?.name ?? "Your workspace"}
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl text-foreground">
                {greeting}, {firstName}.
              </h1>
              <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                Live aggregate across {projects.length} project{projects.length === 1 ? "" : "s"} in{" "}
                <span className="text-foreground font-medium">{currentOrg?.name ?? "this workspace"}</span>.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/projects" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
                <Plus className="size-4" /> New project
              </Link>
              <Link to="/analytics" className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-elevated transition-colors">
                <Activity className="size-4 text-cyan" /> Analytics
              </Link>
            </div>
          </div>
        </div>
      </Rise>

      {/* Stat grid */}
      <Rise>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label: "Commits", value: stats.commits, icon: GitCommit, tone: "from-primary/20 to-primary/5", iconColor: "text-primary" },
            { label: "Open PRs", value: stats.prs, icon: GitPullRequest, tone: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-success" },
            { label: "Open Issues", value: stats.issues, icon: Bug, tone: "from-amber-500/20 to-amber-500/5", iconColor: "text-warning" },
            { label: "Deployments", value: stats.deploys, icon: Rocket, tone: "from-cyan/20 to-cyan/5", iconColor: "text-cyan" },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{ animationDelay: `${i * 80}ms` }}
              className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${s.tone} p-5 shadow-sm`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{s.label}</p>
                <s.icon className={`size-4 ${s.iconColor}`} />
              </div>
              <div className="mt-3 flex h-9 items-center">
                {projectsLoading || loading ? (
                  <div className="h-8 w-16 bg-surface-elevated/70 rounded animate-pulse" />
                ) : (
                  <p className="font-display text-3xl font-bold text-foreground">{s.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Rise>

      {/* Projects */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-foreground">Projects</h2>
          <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            View all →
          </Link>
        </div>

        {projectsLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl border border-border bg-surface p-5 animate-pulse flex items-start gap-3">
                <div className="size-11 rounded-xl bg-surface-elevated/80 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="h-5 w-28 bg-surface-elevated/80 rounded" />
                  <div className="h-3 w-20 bg-surface-elevated/50 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border bg-surface/30 p-12 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <FolderGit2 className="size-6" />
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold text-foreground">No projects yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Import your first GitHub repository to start tracking commits, PRs, and deploys.
            </p>
            <Link to="/projects" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm">
              <Plus className="size-4" /> Import a repo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                to="/projects/$projectId"
                params={{ projectId: p.id } as any}
                className="group relative overflow-hidden rounded-2xl border border-border bg-surface p-5 transition hover:border-primary/40 hover:bg-surface-elevated shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary transition group-hover:bg-primary/25">
                    <FolderGit2 className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold truncate text-foreground">{p.name}</div>
                    <div className="font-mono text-xs text-muted-foreground truncate">
                      {p.owner}/{p.repo}
                    </div>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
