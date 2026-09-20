import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Plus,
  ArrowRight,
  Sparkles,
  Activity,
  Users2,
  Github,
  Zap,
  ShieldCheck,
  Workflow,
  Rocket,
  LayoutDashboard,
  Check,
  ExternalLink,
} from "lucide-react";
import { useAuth, signInWithGitHub } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [{ title: "DevANT — Developer Activity Narrative Tracker" }],
  }),
  component: LandingPage,
});

function LandingPage() {
  const { user } = useAuth();

  return (
    <div className="landing-page min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Sticky Navigation */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-10">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            {["product", "features", "pricing"].map((id) => (
              <button
                key={id}
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })}
                className="capitalize hover:text-foreground transition-colors cursor-pointer"
              >
                {id}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-md"
              >
                <LayoutDashboard className="size-4" /> Go to Dashboard
              </Link>
            ) : (
              <Button
                onClick={() => signInWithGitHub()}
                className="h-10 rounded-full px-5 text-sm font-semibold gap-2 shadow-md cursor-pointer"
              >
                <Github className="size-4" /> Sign in with GitHub
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-[-10%] left-[15%] h-[500px] w-[500px] rounded-full bg-primary/20 blur-[140px]" />
          <div className="absolute top-[20%] right-[0%] h-[400px] w-[400px] rounded-full bg-cyan/15 blur-[120px]" />
          <div className="absolute bottom-[-10%] left-[35%] h-[400px] w-[400px] rounded-full bg-purple-500/10 blur-[140px]" />
        </div>

        {/* Hero Section */}
        <section id="product" className="mx-auto max-w-7xl px-6 pt-12 pb-24 lg:px-10 lg:pt-20">
          <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-8">
              <span className="inline-flex items-center gap-2 rounded-full badge-pill-gradient px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan">
                <Sparkles className="size-3.5 text-cyan" /> GitHub-native dev intelligence
              </span>
              <h1 className="font-display text-5xl font-extrabold leading-[1.05] tracking-[-0.03em] sm:text-6xl lg:text-7xl text-foreground">
                Your entire engineering org,{" "}
                <span className="block text-gradient">
                  one dashboard.
                </span>
              </h1>
              <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">
                DevANT connects your GitHub repos, analyzes every commit with AI, and gives your
                whole team one place to ship faster — with realtime tasks, deployments, and DORA
                metrics.
              </p>
              <div className="flex flex-wrap gap-4">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition shadow-lg"
                  >
                    <LayoutDashboard className="size-4" /> Go to Dashboard <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <Button
                    size="lg"
                    onClick={() => signInWithGitHub()}
                    className="h-12 gap-2 rounded-full px-7 text-sm font-semibold shadow-lg cursor-pointer"
                  >
                    <Github className="size-4" /> Continue with GitHub
                    <ArrowRight className="size-4" />
                  </Button>
                )}
                <Link
                  to="/onboarding"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-surface/60 px-7 text-sm font-semibold text-foreground transition hover:bg-surface-elevated hover:border-border-strong"
                >
                  <Plus className="size-4" /> Create an org
                </Link>
              </div>
              <div className="flex items-center gap-6 pt-4 text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-2"><ShieldCheck className="size-4 text-success" /> SOC2-ready</span>
                <span className="flex items-center gap-2"><Activity className="size-4 text-cyan" /> Realtime sync</span>
                <span className="flex items-center gap-2"><Zap className="size-4 text-primary" /> AI insights</span>
              </div>
            </div>

            {/* Live Workspace Preview Card */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-[28px] border border-border bg-surface/90 p-6 shadow-[0_30px_120px_-20px_rgba(45,97,235,0.35)] backdrop-blur-xl">
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] font-semibold text-muted-foreground">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-success animate-pulse" />
                    Live workspace
                  </span>
                  <span className="font-mono text-muted-foreground">devant.app</span>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl border border-border bg-surface-elevated/70 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">DevANT Premium</p>
                        <p className="mt-1 text-base font-bold text-foreground">12 repos · 8 members</p>
                      </div>
                      <span className="rounded-full border border-primary/40 bg-primary/20 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan">Pro</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {[
                        { label: "COMMITS", value: "1.2k" },
                        { label: "PRS", value: "47" },
                        { label: "DEPLOYS", value: "24" },
                      ].map((s) => (
                        <div key={s.label} className="rounded-xl border border-border/80 bg-background/80 p-3">
                          <p className="text-[11px] uppercase font-semibold tracking-wider text-muted-foreground">{s.label}</p>
                          <p className="mt-1 text-xl font-bold font-display text-foreground">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-surface-elevated/70 p-4">
                    <p className="text-[11px] uppercase font-bold tracking-wider text-cyan">AI COMMIT INSIGHT</p>
                    <p className="mt-2 text-sm leading-relaxed text-foreground font-medium">
                      <span className="text-primary font-bold">→</span> Refactor release workflow to reduce
                      onboarding friction by <span className="font-bold text-success">18%</span>.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-border bg-surface-elevated/70 p-3.5 text-xs">
                      <p className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">PR #432</p>
                      <p className="mt-1 truncate font-semibold text-foreground">feat: realtime task assignment</p>
                      <p className="mt-2 text-success font-medium flex items-center gap-1"><Check className="size-3.5 shrink-0" /> Ready to merge</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-surface-elevated/70 p-3.5 text-xs">
                      <p className="text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">DEPLOY</p>
                      <p className="mt-1 truncate font-semibold text-foreground">api · v2.4.1</p>
                      <p className="mt-2 text-cyan font-medium flex items-center gap-1"><ExternalLink className="size-3.5 shrink-0" /> Production</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
          <div className="mb-12 text-center">
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl text-foreground">Built for shipping teams</h2>
            <p className="mt-3 text-muted-foreground">Everything your org needs, nothing it doesn't.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
                className="group rounded-3xl border border-border bg-surface/50 p-6 transition hover:border-primary/40 hover:bg-surface-elevated shadow-sm"
              >
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                  <f.icon className="size-5" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
          <div className="mb-10 text-center">
            <h2 className="font-display text-3xl font-extrabold sm:text-4xl text-foreground">Simple pricing</h2>
            <p className="mt-3 text-muted-foreground">Start free. Scale when you need to.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-border bg-surface/50 p-8 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Free</p>
              <p className="mt-4 font-display text-4xl font-extrabold text-foreground">$0</p>
              <p className="mt-3 text-sm text-muted-foreground">1 org · 3 projects · 5 members.</p>
              <Button onClick={() => signInWithGitHub()} className="mt-8 w-full cursor-pointer" variant="outline">
                Get started
              </Button>
            </div>
            <div className="relative rounded-3xl border border-primary/50 bg-gradient-to-br from-primary/15 to-cyan/10 p-8 shadow-xl">
              <span className="absolute -top-3 right-7 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase text-primary-foreground shadow-sm">
                Popular
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan">Pro</p>
              <p className="mt-4 font-display text-4xl font-extrabold text-foreground">
                $12<span className="text-base font-normal text-muted-foreground">/user/mo</span>
              </p>
              <p className="mt-3 text-sm text-muted-foreground">Unlimited orgs, projects, members, priority sync.</p>
              <Button onClick={() => signInWithGitHub()} className="mt-8 w-full cursor-pointer">
                Start Pro trial
              </Button>
            </div>
            <div className="rounded-3xl border border-border bg-surface/50 p-8 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-muted-foreground">Enterprise</p>
              <p className="mt-4 font-display text-4xl font-extrabold text-foreground">Custom</p>
              <p className="mt-3 text-sm text-muted-foreground">Dedicated infrastructure, SSO, custom SLAs.</p>
              <a
                href="mailto:hello@devant.app"
                className="mt-8 flex w-full items-center justify-center rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-surface-elevated transition-colors"
              >
                Contact sales
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground lg:px-10">
          © {new Date().getFullYear()} DevANT ·{" "}
          <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
            Privacy
          </Link>{" "}
          ·{" "}
          <Link to="/terms-of-service" className="hover:text-foreground transition-colors">
            Terms
          </Link>
        </footer>
      </div>
    </div>
  );
}
