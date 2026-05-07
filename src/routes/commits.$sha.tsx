import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Copy, Sparkles, GitCommit } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DiffFile } from "@/components/DiffFile";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { getSelectedImportedProject } from "@/lib/imported-projects";
import { getCommit } from "@/lib/github/client";

type CommitDetailModel = {
  sha: string;
  message: string;
  author: string;
  avatar?: string;
  date: string;
  branch: string;
  additions: number;
  deletions: number;
  files: Array<{ filename: string; status: string; additions: number; deletions: number; patch: string }>;
};

export const Route = createFileRoute("/commits/$sha")({
  head: ({ params }) => ({ meta: [{ title: `Commit ${params.sha.slice(0, 7)} — DevANT` }] }),
  component: CommitDetail,
});

function CommitDetail() {
  const { sha } = Route.useParams();
  const { user } = useAuth();
  const [c, setCommit] = useState<CommitDetailModel | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) return;
      const selected = await getSelectedImportedProject(user.id);
      const token = getGitHubToken(user);
      if (!selected || !token) {
        setCommit(null);
        return;
      }

      setLoading(true);
      try {
        const detail = await getCommit(token, selected.owner, selected.repo, sha);
        if (!mounted) return;
        setCommit({
          sha: detail.sha,
          message: detail.commit?.message ?? "",
          author: detail.author?.login ?? detail.commit?.author?.name ?? "unknown",
          avatar: detail.author?.avatar_url,
          date: detail.commit?.author?.date ?? new Date().toISOString(),
          branch: selected.defaultBranch ?? "main",
          additions: detail.stats?.additions ?? 0,
          deletions: detail.stats?.deletions ?? 0,
          files: Array.isArray(detail.files)
            ? detail.files.map((f: any) => ({
                filename: f.filename,
                status: f.status,
                additions: f.additions ?? 0,
                deletions: f.deletions ?? 0,
                patch: f.patch ?? "No patch available for this file type.",
              }))
            : [],
        });
      } catch (err) {
        console.error("Failed to load commit detail", err);
        setCommit(null);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [sha, user]);

  if (!user) {
    return <div className="glass rounded-xl p-6">Sign in and import a project first.</div>;
  }
  if (loading) {
    return <div className="glass rounded-xl p-6">Loading commit details...</div>;
  }
  if (!c) {
    return <div className="glass rounded-xl p-6">Commit not found for your selected imported project.</div>;
  }

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
            <div className="text-lg font-display font-bold">{c.files.length}</div>
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
            Live commit data fetched from GitHub for the selected imported project.
          </p>
        </div>
      </div>

      <h2 className="font-display font-semibold text-lg mb-3">Changed files</h2>
      {c.files.map((f) => (
        <DiffFile key={f.filename} {...f} />
      ))}
    </>
  );
}
