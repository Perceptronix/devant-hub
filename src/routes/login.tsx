import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { signInWithGitHub, useAuth } from "@/lib/auth";
import { useEffect } from "react";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — DevANT" }] }),
  component: Login,
});

function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 h-72 w-72 rounded-full bg-cyan/20 blur-3xl" />
      </div>

      <div className="w-full max-w-lg glass rounded-[36px] border border-white/10 p-10 shadow-2xl shadow-black/20 animate-fade-up">
        <div className="flex justify-center mb-6"><Logo /></div>
        <h1 className="text-3xl font-display font-bold text-center">Sign in to DevANT</h1>
        <p className="text-center text-muted-foreground text-sm mt-3 mb-8">
          Connect with GitHub to join your organization and start shipping with shared team context.
        </p>

        <Button onClick={() => signInWithGitHub()} size="lg" className="w-full gap-2 h-14 text-base">
          <Github className="size-5" /> Continue with GitHub
        </Button>

        <div className="mt-8 grid gap-3 text-center text-sm text-muted-foreground">
          <p>Need an account? Sign in with your GitHub organization.</p>
          <p>
            New here? <Link to="/onboarding" className="text-white underline">Create your org</Link> and invite your team.
          </p>
        </div>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">© {new Date().getFullYear()} DevANT</p>
    </div>
  );
}
