import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/PageHeader";
import { Plus, GitCommit, GitPullRequest, Bug, Rocket, FolderGit2 } from "lucide-react";
import { useAuth, getGitHubToken, signInWithGitHub } from "@/lib/auth";
import { fetchImportedProjects, type ImportedProject } from "@/lib/imported-projects";
import { listCommits, listPulls, listIssues, listDeployments } from "@/lib/github/client";
import { StatCard } from "@/components/StatCard";
import { useSyncListener } from "@/lib/sync";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "DevANT — Your engineering org, one dashboard." }],
  }),
  component: Home,
});

function Home() {
  const { user } = useAuth();
  return user ? <Dashboard /> : <Landing />;
}

function Landing() {
  return (
    <div className="min-h-screen bg-background text-white">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-96 bg-[radial-gradient(circle_at_top_left,_rgba(108,99,255,0.35),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(0,212,255,0.18),_transparent_45%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-80 bg-[radial-gradient(circle_at_bottom_left,_rgba(0,212,255,0.14),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(108,99,255,0.12),_transparent_35%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-14">
          <nav className="flex flex-wrap items-center justify-between gap-4 pb-6">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-3xl bg-primary/15 text-primary flex items-center justify-center font-semibold">D</div>
              <span className="font-semibold tracking-tight">DevANT</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">Sign in</Link>
              <Button onClick={() => signInWithGitHub()} className="h-11 rounded-full px-6 text-sm">Get started</Button>
            </div>
          </nav>

          <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-8">
              <span className="inline-flex rounded-full border border-primary/40 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-primary">GitHub-native dev intelligence</span>
              <h1 className="text-5xl font-display font-bold leading-tight tracking-[-0.03em] sm:text-6xl">Your entire engineering org, one dashboard.</h1>
              <p className="max-w-2xl text-lg text-muted-foreground">DevANT connects GitHub repos, analyzes every commit with AI, tracks deployments, and gives your whole team one place to ship faster.</p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" onClick={() => signInWithGitHub()} className="gap-2 bg-success text-black hover:bg-success/90">Start free with GitHub</Button>
                <Link to="/login" className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-6 text-sm font-semibold text-white/90 transition hover:bg-white/10">See how it works</Link>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[#090a12]/95 p-6 shadow-[0_0_120px_rgba(108,99,255,0.14)] sm:p-8">
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(108,99,255,0.14),transparent_45%),linear-gradient(90deg,rgba(0,212,255,0.12),transparent_50%)]" />
              <div className="relative z-10 space-y-5">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-muted-foreground">
                  <span>Organization overview</span>
                  <span>Live sync</span>
                </div>
                <div className="rounded-3xl bg-[#11121d]/95 p-5">
                  <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
                    <span>DevANT Premium</span>
                    <span className="rounded-full bg-surface px-3 py-1 text-[11px] uppercase">Beta</span>
                  </div>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl bg-[#0e1020] p-4">
                      <p className="text-xs text-muted-foreground">Deployments</p>
                      <p className="mt-3 text-xl font-semibold">24</p>
                    </div>
                    <div className="rounded-3xl bg-[#0e1020] p-4">
                      <p className="text-xs text-muted-foreground">Team tasks</p>
                      <p className="mt-3 text-xl font-semibold">142</p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-3xl border border-white/10 bg-[#090a12] p-4">
                    <div className="text-xs text-muted-foreground">Latest commit insight</div>
                    <div className="mt-3 text-sm text-white">Refactor release workflow to reduce onboarding friction by 18%.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-16 grid gap-4 sm:grid-cols-3">
            {[
              { title: "Realtime chat", description: "Share updates with your team instantly." },
              { title: "AI insights", description: "Actionable commit intelligence at a glance." },
              { title: "Org scope", description: "One workspace for every team and repo." },
            ].map((feature) => (
              <div key={feature.title} className="glass rounded-3xl border border-white/10 p-6">
                <h3 className="font-semibold text-lg">{feature.title}</h3>
                <p className="mt-3 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 grid gap-6 lg:grid-cols-3">
            <div className="glass rounded-3xl border border-white/10 p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Free forever</p>
              <h3 className="mt-3 text-2xl font-semibold">$0</h3>
              <p className="mt-4 text-sm text-muted-foreground">1 org · 3 projects · 5 members · GitHub sync.</p>
              <Button className="mt-6 w-full">Start free</Button>
            </div>
            <div className="glass rounded-3xl border border-primary/40 p-6 shadow-[0_0_0_1px_rgba(108,99,255,0.22)]">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Pro</p>
              <h3 className="mt-3 text-2xl font-semibold">$12/user/mo</h3>
              <p className="mt-4 text-sm text-muted-foreground">Unlimited orgs · unlimited projects · unlimited members · priority sync.</p>
              <Button className="mt-6 w-full bg-primary text-black hover:bg-primary/90">Upgrade</Button>
            </div>
            <div className="glass rounded-3xl border border-white/10 p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Ready to ship</p>
              <h3 className="mt-3 text-2xl font-semibold">Built for teams</h3>
              <p className="mt-4 text-sm text-muted-foreground">Invite teammates, assign work, and keep every repo scoped to your org.</p>
              <Button variant="outline" className="mt-6 w-full">See pricing</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user, tick]);

  if (projects.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" description="Import a GitHub repository to begin." />
        <div className="glass rounded-xl p-6">
          <h2 className="font-display font-semibold text-lg">No linked repositories yet</h2>
          <p className="text-sm text-muted-foreground mt-2">Click <b>New Project+</b> to import a GitHub repository.</p>
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
