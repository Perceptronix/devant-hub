import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Welcome — DevANT" }] }),
  component: Onboarding,
});

function Onboarding() {
  const [step, setStep] = useState(0);
  const steps = ["Organization", "Departments", "First Repo", "Done"];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl">
        <div className="flex justify-center mb-8"><Logo /></div>

        {/* Stepper */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold ${i <= step ? "bg-primary text-primary-foreground" : "bg-surface text-muted-foreground"}`}>
                {i < step ? <Check className="size-3.5" /> : i + 1}
              </div>
              <span className={`text-xs ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < steps.length - 1 && <div className="w-6 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="glass rounded-2xl p-8 animate-fade-up">
          {step === 0 && (
            <>
              <h2 className="text-xl font-display font-semibold mb-1">Create your Organization</h2>
              <p className="text-sm text-muted-foreground mb-5">An org groups your departments, projects and team.</p>
              <div className="space-y-3">
                <Input placeholder="Organization name" />
                <Input placeholder="slug (lowercase, no spaces)" />
                <Input placeholder="GitHub org login (optional)" />
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="text-xl font-display font-semibold mb-1">Add Departments</h2>
              <p className="text-sm text-muted-foreground mb-5">Group projects by team — ML, UI/UX, 3D, Backend, DevOps…</p>
              <div className="space-y-2">
                {["🧠 ML", "🎨 UI/UX", "🧊 3D Design", "⚙️ Backend"].map((d) => (
                  <div key={d} className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface">
                    <span>{d}</span>
                    <Check className="size-4 text-success" />
                  </div>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="text-xl font-display font-semibold mb-1">Link Your First Repo</h2>
              <p className="text-sm text-muted-foreground mb-5">We'll register a webhook and start syncing commits.</p>
              <Input placeholder="owner/repository" />
            </>
          )}
          {step === 3 && (
            <div className="text-center py-6">
              <div className="size-16 rounded-full bg-success/20 mx-auto flex items-center justify-center mb-4">
                <Check className="size-8 text-success" />
              </div>
              <h2 className="text-xl font-display font-semibold">You're all set!</h2>
              <p className="text-sm text-muted-foreground mt-1">Redirecting to your dashboard…</p>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>Back</Button>
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>Continue</Button>
            ) : (
              <Link to="/"><Button>Go to Dashboard</Button></Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
