import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  GitCommit,
  GitPullRequest,
  Bug,
  Rocket,
  FolderGit2,
  ArrowRight,
  Sparkles,
  Activity,
  Users2,
  Github,
  Zap,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { useAuth, getGitHubToken, signInWithGitHub } from "@/lib/auth";
import { fetchImportedProjects, type ImportedProject } from "@/lib/imported-projects";
import { listCommits, listPulls, listIssues, listDeployments } from "@/lib/github/client";
import { useSyncListener } from "@/lib/sync";
import { useCurrentOrg } from "@/lib/current-org";
import { AppShell } from "@/components/AppShell";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "DevANT — Your engineering org, one dashboard." }],
  }),
  component: Home,
});

function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="size-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <Landing />;

  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
}

/* ------------------------------ LANDING ------------------------------ */

function Landing() {
  return (
    <div className="min-h-screen bg-[#05060d] text-white">
      <div className="relative overflow-hidden">
        {/* ambient glows */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-[-10%] left-[10%] h-[500px] w-[500px] rounded-full bg-primary/25 blur-[140px]" />
          <div className="absolute top-[20%] right-[-5%] h-[400px] w-[400px] rounded-full bg-cyan-500/20 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[40%] h-[400px] w-[400px] rounded-full bg-emerald-500/15 blur-[140px]" />
        </div>

        {/* nav */}
        <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#product" className="hover:text-foreground transition">Product</a>
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline"
            >
              Sign in
            </Link>
            <Button
              onClick={() => signInWithGitHub()}
              className="h-10 rounded-full px-5 text-sm gap-2"
            >
              <Github className="size-4" /> Start free
            </Button>
          </div>
        </header>

        {/* hero */}
        <section className="mx-auto max-w-7xl px-6 pt-10 pb-24 lg:px-10 lg:pt-16">
          <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-8">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <Sparkles className="size-3.5" /> GitHub-native dev intelligence
              </span>
              <h1 className="font-display text-5xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-6xl lg:text-7xl">
                Your entire engineering org,
                <span className="block bg-gradient-to-r from-primary via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
                  one dashboard.
                </span>
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground">
                DevANT connects your GitHub repos, analyzes every commit with AI, and gives your
                whole team one place to ship faster — with realtime tasks, deployments, and DORA
                metrics.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  size="lg"
                  onClick={() => signInWithGitHub()}
                  className="h-12 gap-2 rounded-full px-7 text-sm font-semibold"
                >
                  <Github className="size-4" /> Continue with GitHub
                  <ArrowRight className="size-4" />
                </Button>
                <Link
                  to="/onboarding"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-7 text-sm font-semibold text-white/90 transition hover:bg-white/10"
                >
                  <Plus className="size-4" /> Create an org
                </Link>
              </div>
              <div className="flex items-center gap-6 pt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-emerald-400" /> SOC2-ready</span>
                <span className="flex items-center gap-2"><Activity className="size-4 text-cyan-400" /> Realtime sync</span>
                <span className="flex items-center gap-2"><Zap className="size-4 text-primary" /> AI insights</span>
              </div>
            </div>

            {/* product mock */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#0c0e1c]/95 to-[#06070f]/95 p-6 shadow-[0_30px_120px_-20px_rgba(108,99,255,0.4)]">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live workspace
                  </span>
                  <span>devant.app</span>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-muted-foreground">DevANT Premium</p>
                        <p className="mt-1 text-base font-semibold">12 repos · 8 members</p>
                      </div>
                      <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase text-primary">Pro</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {[
                        { label: "Commits", value: "1.2k" },
                        { label: "PRs", value: "47" },
                        { label: "Deploys", value: "24" },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl bg-black/40 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.label}</p>
                          <p className="mt-1 text-lg font-semibold">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">AI commit insight</p>
                    <p className="mt-2 text-sm leading-relaxed">
                      <span className="text-primary">→</span> Refactor release workflow to reduce
                      onboarding friction by <span className="font-semibold text-emerald-400">18%</span>.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-xs">
                      <p className="text-muted-foreground">PR #432</p>
                      <p className="mt-1 truncate font-medium">feat: realtime task assignment</p>
                      <p className="mt-2 text-emerald-400">✓ Ready to merge</p>
                    </div>
                    <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-3 text-xs">
                      <p className="text-muted-foreground">Deploy</p>
                      <p className="mt-1 truncate font-medium">api · v2.4.1</p>
                      <p className="mt-2 text-cyan-400">↗ Production</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* features */}
        <section id="features" className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Built for shipping teams</h2>
            <p className="mt-3 text-muted-foreground">Everything your org needs, nothing it doesn't.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Workflow, title: "Org-scoped projects", desc: "Multi-tenant workspaces with role-based access. Switch orgs in one click." },
              { icon: Activity, title: "Realtime everything", desc: "Tasks, messages, deploys — every member sees the same state instantly." },
              { icon: Sparkles, title: "AI commit insights", desc: "Plain-English summaries of every push, with risk and impact scoring." },
              { icon: Users2, title: "Team chat", desc: "Per-project messaging with mentions and live presence." },
              { icon: Rocket, title: "DORA metrics", desc: "Deployment frequency, lead time, MTTR — without spreadsheets." },
              { icon: ShieldCheck, title: "GitHub-native auth", desc: "OAuth, repo-scoped, no credentials stored. Your data stays yours." },
            ].map((f) => (
              <div
                key={f.title}
                className="group rounded-3xl border border-white/10 bg-white/[0.02] p-6 transition hover:border-primary/40 hover:bg-white/[0.04]"
              >
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary transition group-hover:bg-primary/25">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* pricing */}
        <section id="pricing" className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Simple pricing</h2>
            <p className="mt-3 text-muted-foreground">Start free. Scale when you need to.</p>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Free</p>
              <p className="mt-4 font-display text-4xl font-bold">$0</p>
              <p className="mt-3 text-sm text-muted-foreground">1 org · 3 projects · 5 members.</p>
              <Button onClick={() => signInWithGitHub()} className="mt-7 w-full" variant="outline">Get started</Button>
            </div>
            <div className="relative rounded-3xl border border-primary/50 bg-gradient-to-br from-primary/10 to-cyan-500/5 p-7 shadow-[0_0_60px_-15px_rgba(108,99,255,0.5)]">
              <span className="absolute -top-3 right-7 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase text-black">Popular</span>
              <p className="text-xs uppercase tracking-[0.24em] text-primary">Pro</p>
              <p className="mt-4 font-display text-4xl font-bold">$12<span className="text-base font-normal text-muted-foreground">/user/mo</span></p>
              <p className="mt-3 text-sm text-muted-foreground">Unlimited orgs, projects, members, priority sync.</p>
              <Button onClick={() => signInWithGitHub()} className="mt-7 w-full">Start Pro trial</Button>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/[0.02] p-7">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Enterprise</p>
              <p className="mt-4 font-display text-4xl font-bold">Custom</p>
              <p className="mt-3 text-sm text-muted-foreground">SSO, audit logs, dedicated support, SLA.</p>
              <Button asChild className="mt-7 w-full" variant="outline"><a href="mailto:hello@devant.app">Contact sales</a></Button>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/5 px-6 py-8 text-center text-xs text-muted-foreground lg:px-10">
          © {new Date().getFullYear()} DevANT · <Link to="/privacy-policy" className="hover:text-foreground">Privacy</Link> · <Link to="/terms-of-service" className="hover:text-foreground">Terms</Link>
        </footer>
      </div>
    </div>
  );
}

/* ------------------------------ DASHBOARD ------------------------------ */

function Dashboard() {
  const { user } = useAuth();
  const { currentOrg, orgs, loading: orgsLoading } = useCurrentOrg();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ImportedProject[]>([]);
  const [stats, setStats] = useState({ commits: 0, prs: 0, issues: 0, deploys: 0 });
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  useSyncListener(() => setTick((n) => n + 1));

  // No org? Push to onboarding (Supabase-style first-run).
  useEffect(() => {
    if (!orgsLoading && user && orgs.length === 0) {
      navigate({ to: "/onboarding" });
    }
  }, [orgsLoading, user, orgs.length, navigate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) {
        setProjects([]);
        return;
      }
      const all = await fetchImportedProjects(user.id);
      const list = currentOrg
        ? all.filter((p) => !p.org_id || p.org_id === currentOrg.id)
        : all;
      if (!mounted) return;
      setProjects(list);
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
      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-primary/15 via-[#0c0e1c]/60 to-cyan-500/10 p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-10 h-52 w-52 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-primary/80">
              {currentOrg?.name ?? "Your workspace"}
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {greeting}, {firstName}.
            </h1>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              Live aggregate across {projects.length} project{projects.length === 1 ? "" : "s"} in{" "}
              <span className="text-foreground">{currentOrg?.name ?? "this workspace"}</span>.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="gap-2">
              <Link to="/projects">
                <Plus className="size-4" /> New project
              </Link>
            </Button>
            <Button asChild variant="outline" className="gap-2">
              <Link to="/analytics">
                <Activity className="size-4" /> Analytics
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Commits", value: stats.commits, icon: GitCommit, tone: "from-primary/20 to-primary/5", iconColor: "text-primary" },
          { label: "Open PRs", value: stats.prs, icon: GitPullRequest, tone: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-400" },
          { label: "Open Issues", value: stats.issues, icon: Bug, tone: "from-amber-500/20 to-amber-500/5", iconColor: "text-amber-400" },
          { label: "Deployments", value: stats.deploys, icon: Rocket, tone: "from-cyan-500/20 to-cyan-500/5", iconColor: "text-cyan-400" },
        ].map((s) => (
          <div
            key={s.label}
            className={`relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br ${s.tone} p-5`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <s.icon className={`size-4 ${s.iconColor}`} />
            </div>
            <p className="mt-3 font-display text-3xl font-bold">{loading ? "—" : s.value}</p>
          </div>
        ))}
      </div>

      {/* Projects */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Projects</h2>
          <Link to="/projects" className="text-sm text-muted-foreground hover:text-foreground">
            View all →
          </Link>
        </div>

        {projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <FolderGit2 className="size-6" />
            </div>
            <h3 className="mt-5 font-display text-lg font-semibold">No projects yet</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Import your first GitHub repository to start tracking commits, PRs, and deploys.
            </p>
            <Button asChild className="mt-6 gap-2">
              <Link to="/projects">
                <Plus className="size-4" /> Import a repo
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                to="/projects/$projectId"
                params={{ projectId: p.id } as any}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-5 transition hover:border-primary/40 hover:bg-white/[0.04]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-primary/15 text-primary transition group-hover:bg-primary/25">
                    <FolderGit2 className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold truncate">{p.name}</div>
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
