import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy-policy")({
  head: () => ({ meta: [{ title: "Privacy Policy — DevANT" }] }),
  component: Privacy,
});

function Privacy() {
  return (
    <div className="min-h-screen bg-background py-10 px-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6"><ArrowLeft className="size-4" /> Home</Link>
        <Logo />
        <h1 className="text-3xl font-display font-bold mt-6 mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-invert max-w-none space-y-6 text-sm leading-relaxed text-foreground">
          <section>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">1. Data We Collect</h2>
            <p>When you connect with GitHub, we receive your GitHub OAuth access token, your public profile (login, name, avatar), email address, and metadata about repositories you authorize us to access (commits, issues, PRs, deployments, team membership).</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">2. Storage</h2>
            <p>All data is stored in your designated Supabase instance. Tokens are encrypted at rest. Repository metadata is cached only to provide the dashboard experience.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">3. Third Parties</h2>
            <p>DevANT calls the GitHub REST API on your behalf and may call AI providers (Anthropic Claude or OpenAI) to summarize commit content. Your OAuth token is never shared with these AI providers.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">4. Your Rights</h2>
            <p>You may revoke GitHub access at any time from your GitHub settings, request data deletion via the Danger Zone in Settings, or contact us for any data portability needs.</p>
          </section>
          <section>
            <h2 className="font-display text-xl font-semibold mt-6 mb-2">5. Contact</h2>
            <p>Questions? Reach out at privacy@devant.app.</p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex gap-4 text-xs text-muted-foreground">
          <Link to="/terms-of-service" className="hover:text-foreground">Terms of Service</Link>
          <Link to="/" className="hover:text-foreground">Home</Link>
        </div>
      </div>
    </div>
  );
}
