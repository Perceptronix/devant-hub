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
        <div className="absolute top-1/4 left-1/4 size-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 size-96 rounded-full bg-cyan/20 blur-3xl" />
      </div>

      <div className="w-full max-w-md glass rounded-2xl p-8 animate-fade-up">
        <div className="flex justify-center mb-6"><Logo /></div>
        <h1 className="text-2xl font-display font-bold text-center">Welcome to DevANT</h1>
        <p className="text-center text-muted-foreground text-sm mt-2 mb-8">
          Developer Intelligence, <span className="text-gradient font-semibold">Supercharged</span>.
        </p>

        <Button onClick={() => signInWithGitHub()} size="lg" className="w-full gap-2 h-12 text-base">
          <Github className="size-5" /> Connect with GitHub
        </Button>

        <p className="mt-6 text-[11px] text-muted-foreground text-center leading-relaxed">
          By continuing you agree to our <Link to="/terms-of-service" className="underline hover:text-foreground">Terms</Link> and <Link to="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link>.
        </p>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">© {new Date().getFullYear()} DevANT</p>
    </div>
  );
}
