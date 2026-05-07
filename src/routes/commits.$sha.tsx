import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, Sparkles, GitCommit } from "lucide-react";
import { demoCommits, demoPatch } from "@/lib/demo-data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DiffFile } from "@/components/DiffFile";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/commits/$sha")({
  head: ({ params }) => ({ meta: [{ title: `Commit ${params.sha.slice(0, 7)} — DevANT` }] }),
  component: CommitDetail,
});

function CommitDetail() {
  const { sha } = Route.useParams();
  const c = demoCommits.find((x) => x.sha === sha) ?? demoCommits[0];

  // Simulated patch data with multiple files
  const files = [
    { filename: "src/routes/login.tsx", status: "modified", additions: 18, deletions: 4, patch: demoPatch },
    { filename: "src/lib/auth.ts", status: "added", additions: 42, deletions: 0, patch: `@@ -0,0 +1,12 @@\n+export async function signInWithGitHub() {\n+  return supabase.auth.signInWithOAuth({\n+    provider: "github",\n+    options: { scopes: "repo read:org" }\n+  });\n+}\n+\n+export async function signOut() {\n+  await supabase.auth.signOut();\n+}` },
    { filename: "README.md", status: "modified", additions: 3, deletions: 1, patch: `@@ -1,5 +1,7 @@\n # DevANT\n \n-Project management dashboard.\n+## DevANT — Developer Intelligence, Supercharged\n+\n+GitHub-integrated project management dashboard with AI-powered commit insights.\n` },
  ];

  return (
    <>
      <Link to="/commits" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4" /> Back to commits
      </Link>

      <div className="glass rounded-xl p-5 mb-4 animate-fade-up">
        <div className="flex items-start gap-4 mb-4">
          <div className="size-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><GitCommit className="size-5" /></div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-xl">{c.message}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Avatar className="size-5"><AvatarImage src={c.avatar} /><AvatarFallback>{c.author[0]}</AvatarFallback></Avatar>
                @{c.author}
              </div>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(c.date), { addSuffix: true })}</span>
              <span>·</span>
              <Badge variant="outline" className="text-xs">{c.branch}</Badge>
              <span>·</span>
              <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-surface flex items-center gap-1">
                {c.sha} <Copy className="size-3 cursor-pointer hover:text-foreground" />
              </code>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg bg-surface-elevated p-3 text-center">
            <div className="text-[10px] uppercase text-muted-foreground tracking-wider">Files</div>
            <div className="text-lg font-display font-bold">{files.length}</div>
          </div>
          <div className="rounded-lg bg-success/10 p-3 text-center">
            <div className="text-[10px] uppercase text-success tracking-wider">Added</div>
            <div className="text-lg font-display font-bold text-success">+{c.additions}</div>
          </div>
          <div className="rounded-lg bg-danger/10 p-3 text-center">
            <div className="text-[10px] uppercase text-danger tracking-wider">Removed</div>
            <div className="text-lg font-display font-bold text-danger">-{c.deletions}</div>
          </div>
        </div>

        {/* AI Summary */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-4 text-primary" />
            <span className="font-display font-semibold text-sm">AI Summary</span>
            <span className="text-[10px] uppercase text-muted-foreground tracking-wider ml-auto">Claude</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            This commit migrates the authentication flow from Google OAuth to GitHub OAuth using Supabase Auth.
            It introduces a new <code className="font-mono text-xs bg-surface px-1 rounded">signInWithGitHub</code> helper,
            updates the login button copy, and refreshes README with the new tagline. Net change is small but touches
            the user-facing entry point of the app.
          </p>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {c.tags.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] border-primary/30 text-primary">{t}</Badge>
            ))}
            <Badge variant="outline" className="text-[10px] border-cyan/30 text-cyan">auth</Badge>
          </div>
        </div>
      </div>

      <h2 className="font-display font-semibold text-lg mb-3">Changed files</h2>
      {files.map((f) => (
        <DiffFile key={f.filename} {...f} />
      ))}
    </>
  );
}
