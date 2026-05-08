import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, GitCommit, GitPullRequest, Bug, Rocket, FolderGit2 } from "lucide-react";
import { useAuth, getGitHubToken, signInWithGitHub } from "@/lib/auth";
import { fetchImportedProjects, type ImportedProject } from "@/lib/imported-projects";
import { useEffect, useState } from "react";
import { listCommits, listPulls, listIssues, listDeployments } from "@/lib/github/client";
import { StatCard } from "@/components/StatCard";
import { useSyncListener } from "@/lib/sync";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — DevANT" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ImportedProject[]>([]);
  const [stats, setStats] = useState({ commits: 0, prs: 0, issues: 0, deploys: 0 });
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  useSyncListener(() => setTick((n) => n + 1));

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) { setProjects([]); return; }
      const list = await fetchImportedProjects(user.id);
      if (!mounted) return;
      setProjects(list);
      const token = getGitHubToken(user);
      if (!token || list.length === 0) return;
      setLoading(true);
      try {
        let commits = 0, prs = 0, issues = 0, deploys = 0;
        await Promise.all(list.map(async (p) => {
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
        }));
        if (mounted) setStats({ commits, prs, issues, deploys });
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [user, tick]);

  if (!user) {
    return (
      <>
        <PageHeader title="Dashboard" description="Sign in to load your imported projects." />
        <div className="glass rounded-xl p-6">
          <p className="text-sm text-muted-foreground mb-3">You are not signed in.</p>
          <Button onClick={() => signInWithGitHub()}>Sign in with GitHub</Button>
        </div>
      </>
    );
  }

  if (projects.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" description="Import a GitHub repository to begin." />
        <div className="glass rounded-xl p-6">
          <h2 className="font-display font-semibold text-lg">No linked repositories</h2>
          <p className="text-sm text-muted-foreground mt-2">Stats stay at zero until you import a project.</p>
          <Link to="/projects"><Button className="gap-1.5 mt-4"><Plus className="size-4" /> Open Projects</Button></Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" description={`Live aggregate across ${projects.length} project${projects.length === 1 ? "" : "s"}.`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Commits" value={loading ? 0 : stats.commits} icon={GitCommit} accent="primary" />
        <StatCard label="Open PRs" value={loading ? 0 : stats.prs} icon={GitPullRequest} accent="success" />
        <StatCard label="Open Issues" value={loading ? 0 : stats.issues} icon={Bug} accent="warning" />
        <StatCard label="Deployments" value={loading ? 0 : stats.deploys} icon={Rocket} accent="cyan" />
      </div>

      <h2 className="font-display font-semibold text-lg mb-3">Your Projects</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {projects.map((p) => (
          <Link key={p.id} to="/projects/$projectId" params={{ projectId: p.id } as any} className="glass glass-hover rounded-xl p-5 block">
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><FolderGit2 className="size-5" /></div>
              <div className="min-w-0">
                <div className="font-display font-semibold truncate">{p.name}</div>
                <div className="text-xs font-mono text-muted-foreground truncate">{p.owner}/{p.repo}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
