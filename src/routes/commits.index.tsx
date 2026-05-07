import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { getSelectedImportedProject } from "@/lib/imported-projects";
import { listCommits } from "@/lib/github/client";

type CommitRow = {
  sha: string;
  author: string;
  avatar?: string;
  message: string;
  branch: string;
  additions: number;
  deletions: number;
  date: string;
  tags: string[];
};

export const Route = createFileRoute("/commits/")({
  head: () => ({ meta: [{ title: "Commits — DevANT" }] }),
  component: Commits,
});

function Commits() {
  const { user } = useAuth();
  const [commits, setCommits] = useState<CommitRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) return;
      const selected = getSelectedImportedProject(user.id);
      if (!selected) {
        setCommits([]);
        return;
      }
      const token = getGitHubToken(user);
      if (!token) {
        setCommits([]);
        return;
      }
      setLoading(true);
      try {
        const list = await listCommits(token, selected.owner, selected.repo, { per_page: 50 });
        if (!mounted) return;
        setCommits(
          list.map((c: any) => ({
            sha: c.sha,
            author: c.author?.login ?? c.commit?.author?.name ?? "unknown",
            avatar: c.author?.avatar_url,
            message: c.commit?.message ?? "",
            branch: selected.defaultBranch ?? "main",
            additions: 0,
            deletions: 0,
            date: c.commit?.author?.date ?? new Date().toISOString(),
            tags: [],
          }))
        );
      } catch (err) {
        console.error("Failed to load commits", err);
        setCommits([]);
      } finally {
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <>
      <PageHeader
        title="Commits"
        description="All commits across linked projects, with AI-generated tags."
        action={<Button variant="outline" className="gap-1.5"><Sparkles className="size-4" /> Analyze All</Button>}
      />

      {!user ? (
        <div className="glass rounded-xl p-6">Sign in and import a project first.</div>
      ) : loading ? (
        <div className="glass rounded-xl p-6">Loading commits...</div>
      ) : commits.length === 0 ? (
        <div className="glass rounded-xl p-6">No commits yet. Import a project from New Project+ first.</div>
      ) : (
      <div className="glass rounded-xl overflow-hidden animate-fade-up">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead className="bg-surface sticky top-0 z-10">
              <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-3">SHA</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Message</th>
                <th className="px-4 py-3">Branch</th>
                <th className="px-4 py-3 text-right">Changes</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {commits.map((c) => (
                <tr key={c.sha} className="border-t border-border hover:bg-surface-elevated/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link to="/commits/$sha" params={{ sha: c.sha }} className="font-mono text-xs px-2 py-0.5 rounded bg-surface text-primary hover:bg-primary/10">
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
                    <Link to="/commits/$sha" params={{ sha: c.sha }} className="truncate block hover:text-primary">{c.message}</Link>
                  </td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{c.branch}</Badge></td>
                  <td className="px-4 py-3 text-right text-xs font-mono">
                    <span className="text-success">+{c.additions}</span> <span className="text-danger">-{c.deletions}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.tags.map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">{t}</span>
                      ))}
                    </div>
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
