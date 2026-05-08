import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GitPullRequest } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { useProject } from "@/lib/use-project";
import { listPulls } from "@/lib/github/client";
import { formatDistanceToNow } from "date-fns";
import { useSyncListener } from "@/lib/sync";

export const Route = createFileRoute("/projects/$projectId/pulls")({
  component: Pulls,
});

function Pulls() {
  const { projectId } = useParams({ from: "/projects/$projectId/pulls" });
  const { project } = useProject(projectId);
  const { user } = useAuth();
  const [pulls, setPulls] = useState<any[]>([]);
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
        const list = await listPulls(token, project.owner, project.repo, "all");
        if (!mounted) return;
        setPulls(list.map((p: any) => ({
          number: p.number, title: p.title,
          state: p.merged_at ? "merged" : p.state === "closed" ? "closed" : "open",
          author: p.user?.login ?? "unknown",
          base: p.base?.ref ?? "-", head: p.head?.ref ?? "-",
          additions: p.additions ?? 0, deletions: p.deletions ?? 0, changed: p.changed_files ?? 0,
          age: p.updated_at ? formatDistanceToNow(new Date(p.updated_at), { addSuffix: true }) : "-",
          labels: Array.isArray(p.labels) ? p.labels.map((l: any) => (typeof l === "string" ? l : l.name)).filter(Boolean) : [],
          reviewers: Array.isArray(p.requested_reviewers) ? p.requested_reviewers.map((r: any) => r.login).filter(Boolean) : [],
        })));
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [user, project, tick]);

  const filter = (s: string) => (s === "all" ? pulls : pulls.filter((p) => p.state === s));

  return (
    <>
      <h1 className="text-2xl font-display font-bold mb-4">Pull Requests</h1>
      {loading && pulls.length === 0 ? <div className="glass rounded-xl p-6 text-sm text-muted-foreground mb-3">Loading…</div> : null}
      <Tabs defaultValue="open">
        <TabsList><TabsTrigger value="open">Open</TabsTrigger><TabsTrigger value="closed">Closed</TabsTrigger><TabsTrigger value="all">All</TabsTrigger></TabsList>
        {["open", "closed", "all"].map((s) => (
          <TabsContent key={s} value={s}>
            <div className="space-y-2 mt-4">
              {filter(s).length === 0 ? <div className="glass rounded-xl p-6 text-sm text-muted-foreground">Nothing here.</div> : null}
              {filter(s).map((p) => (
                <div key={p.number} className="glass glass-hover rounded-xl p-4 flex items-start gap-4">
                  <GitPullRequest className={`size-5 mt-0.5 shrink-0 ${p.state === "merged" ? "text-primary" : p.state === "closed" ? "text-danger" : "text-success"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground text-sm">#{p.number}</span>
                      <span className="font-medium">{p.title}</span>
                      <StatusBadge status={p.state} />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1.5 flex-wrap">
                      <span>@{p.author}</span><span>·</span>
                      <span className="font-mono">{p.base} ← {p.head}</span><span>·</span>
                      <span className="text-success">+{p.additions}</span><span className="text-danger">-{p.deletions}</span><span>·</span>
                      <span>{p.changed} files</span><span>·</span><span>{p.age}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {p.labels.map((l: string) => <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>)}
                    </div>
                  </div>
                  <div className="flex -space-x-2 shrink-0">
                    {p.reviewers.map((r: string) => (
                      <Avatar key={r} className="size-6 border-2 border-background"><AvatarFallback className="text-[10px]">{r[0].toUpperCase()}</AvatarFallback></Avatar>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}
