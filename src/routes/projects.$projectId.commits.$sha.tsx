import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, Copy, Sparkles, GitCommit } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { DiffFile } from "@/components/DiffFile";
import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { useProject } from "@/lib/use-project";
import { getCommit } from "@/lib/github/client";

export const Route = createFileRoute("/projects/$projectId/commits/$sha")({
  component: CommitDetail,
});

function CommitDetail() {
  const { projectId, sha } = useParams({ from: "/projects/$projectId/commits/$sha" });
  const { project } = useProject(projectId);
  const { user } = useAuth();
  const [c, setC] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user || !project) return;
      const token = getGitHubToken(user);
      if (!token) return;
      setLoading(true);
      try {
        const detail = await getCommit(token, project.owner, project.repo, sha);
        if (!mounted) return;
        setC({
          sha: detail.sha,
          message: detail.commit?.message ?? "",
          author: detail.author?.login ?? detail.commit?.author?.name ?? "unknown",
          avatar: detail.author?.avatar_url,
          date: detail.commit?.author?.date ?? new Date().toISOString(),
          branch: project.defaultBranch ?? "main",
          additions: detail.stats?.additions ?? 0,
          deletions: detail.stats?.deletions ?? 0,
          files: Array.isArray(detail.files) ? detail.files.map((f: any) => ({
            filename: f.filename, status: f.status,
            additions: f.additions ?? 0, deletions: f.deletions ?? 0,
            patch: f.patch ?? "No patch available for this file type.",
          })) : [],
        });
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [user, project, sha]);

  if (loading) return <div className="glass rounded-xl p-6">Loading commit…</div>;
  if (!c) return <div className="glass rounded-xl p-6">Commit not found.</div>;

  return (
    <>
      <Link to="/projects/$projectId/commits" params={{ projectId }} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="size-4" /> Back to commits
      </Link>

      <div className="glass rounded-xl p-5 mb-4">
        <div className="flex items-start gap-4 mb-4">
          <div className="size-10 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><GitCommit className="size-5" /></div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-xl">{c.message.split("\n")[0]}</h1>
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
                {c.sha.slice(0, 12)} <Copy className="size-3 cursor-pointer hover:text-foreground" onClick={() => navigator.clipboard?.writeText(c.sha)} />
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

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-4 text-primary" />
            <span className="font-display font-semibold text-sm">AI Summary</span>
          </div>
          <p className="text-sm leading-relaxed text-foreground/80">
            Live commit data fetched from GitHub for {project?.owner}/{project?.repo}.
          </p>
        </div>
      </div>

      <h2 className="font-display font-semibold text-lg mb-3">Changed files</h2>
      {c.files.length === 0 ? (
        <div className="glass rounded-xl p-4 text-sm text-muted-foreground">No files edited.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          <aside className="glass rounded-xl p-3 lg:sticky lg:top-20 self-start max-h-[calc(100vh-6rem)] flex flex-col">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2 px-1">Files ({c.files.length})</div>
            <div className="space-y-1 overflow-auto scrollbar-thin flex-1">
              {c.files.map((f: any) => (
                <a key={f.filename} href={`#file-${f.filename.replace(/[^a-zA-Z0-9_-]/g, "-")}`} className="block text-xs font-mono px-2 py-1 rounded hover:bg-surface-elevated truncate" title={f.filename}>
                  {f.filename}
                </a>
              ))}
            </div>
          </aside>
          <div className="lg:col-span-3 min-w-0">
            {c.files.map((f: any) => (
              <div key={f.filename} id={`file-${f.filename.replace(/[^a-zA-Z0-9_-]/g, "-")}`}>
                <DiffFile {...f} />
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
