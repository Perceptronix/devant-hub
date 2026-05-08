import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { useProject } from "@/lib/use-project";
import { getCommit, listCommits } from "@/lib/github/client";
import { useSyncListener } from "@/lib/sync";

type CommitRow = {
  sha: string; author: string; avatar?: string; message: string;
  branch: string; additions: number; deletions: number; date: string;
};

export const Route = createFileRoute("/projects/$projectId/commits/")({
  component: Commits,
});

function Commits() {
  const { projectId } = useParams({ from: "/projects/$projectId/commits" });
  const { project } = useProject(projectId);
  const { user } = useAuth();
  const [rows, setRows] = useState<CommitRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  useSyncListener(() => setTick((n) => n + 1));

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user || !project) return;
      const token = getGitHubToken(user);
      if (!token) return;
      setLoading(true);
      try {
        const list = await listCommits(token, project.owner, project.repo, { per_page: 30 });
        const detailed = await Promise.all(list.map(async (c: any) => {
          try { const d = await getCommit(token, project.owner, project.repo, c.sha); return { ...c, detail: d }; }
          catch { return { ...c, detail: null }; }
        }));
        if (!mounted) return;
        setRows(detailed.map((c: any) => ({
          sha: c.sha,
          author: c.author?.login ?? c.commit?.author?.name ?? "unknown",
          avatar: c.author?.avatar_url,
          message: (c.commit?.message ?? "").split("\n")[0],
          branch: project.defaultBranch ?? "main",
          additions: c.detail?.stats?.additions ?? 0,
          deletions: c.detail?.stats?.deletions ?? 0,
          date: c.commit?.author?.date ?? new Date().toISOString(),
        })));
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [user, project, tick]);

  return (
    <>
      <h1 className="text-2xl font-display font-bold mb-4">Commits</h1>
      {loading ? (
        <div className="glass rounded-xl p-6 text-sm text-muted-foreground">Loading commits…</div>
      ) : rows.length === 0 ? (
        <div className="glass rounded-xl p-6 text-sm text-muted-foreground">No commits.</div>
      ) : (
        <div className="glass rounded-xl overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="bg-surface">
                <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3">SHA</th><th className="px-4 py-3">Author</th>
                  <th className="px-4 py-3">Message</th><th className="px-4 py-3">Branch</th>
                  <th className="px-4 py-3 text-right">Changes</th><th className="px-4 py-3">When</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.sha} className="border-t border-border hover:bg-surface-elevated/50">
                    <td className="px-4 py-3">
                      <Link to="/projects/$projectId/commits/$sha" params={{ projectId, sha: c.sha }} className="font-mono text-xs px-2 py-0.5 rounded bg-surface text-primary hover:bg-primary/10">
                        {c.sha.slice(0, 7)}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-6"><AvatarImage src={c.avatar} /><AvatarFallback>{c.author[0]}</AvatarFallback></Avatar>
                        <span className="text-xs">@{c.author}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-md">
                      <Link to="/projects/$projectId/commits/$sha" params={{ projectId, sha: c.sha }} className="truncate block hover:text-primary">{c.message}</Link>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{c.branch}</Badge></td>
                    <td className="px-4 py-3 text-right text-xs font-mono">
                      <span className="text-success">+{c.additions}</span> <span className="text-danger">-{c.deletions}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(c.date), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
