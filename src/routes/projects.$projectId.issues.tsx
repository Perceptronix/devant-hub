import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CircleCheck, CircleDot } from "lucide-react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { useProject } from "@/lib/use-project";
import { listIssues } from "@/lib/github/client";
import { useSyncListener } from "@/lib/sync";

export const Route = createFileRoute("/projects/$projectId/issues")({
  component: Issues,
});

function Issues() {
  const { projectId } = useParams({ from: "/projects/$projectId/issues" });
  const { project } = useProject(projectId);
  const { user } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
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
        const list = await listIssues(token, project.owner, project.repo, "all");
        if (!mounted) return;
        setIssues(list.filter((i: any) => !i.pull_request).map((i: any) => ({
          number: i.number, title: i.title,
          author: i.user?.login ?? "unknown",
          age: i.updated_at ? new Date(i.updated_at).toLocaleString() : "-",
          labels: Array.isArray(i.labels) ? i.labels.map((l: any) => (typeof l === "string" ? l : l.name)).filter(Boolean) : [],
          state: i.state === "closed" ? "closed" : "open",
        })));
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [user, project, tick]);

  const f = (s: string) => issues.filter((i) => i.state === s);
  return (
    <>
      <h1 className="text-2xl font-display font-bold mb-4">Issues</h1>
      {loading && issues.length === 0 ? <div className="glass rounded-xl p-6 text-sm text-muted-foreground mb-3">Loading…</div> : null}
      <Tabs defaultValue="open">
        <TabsList><TabsTrigger value="open">Open ({f("open").length})</TabsTrigger><TabsTrigger value="closed">Closed ({f("closed").length})</TabsTrigger></TabsList>
        {["open", "closed"].map((s) => (
          <TabsContent key={s} value={s}>
            <div className="space-y-2 mt-4">
              {f(s).length === 0 ? <div className="glass rounded-xl p-6 text-sm text-muted-foreground">Nothing here.</div> : null}
              {f(s).map((i) => (
                <div key={i.number} className="glass glass-hover rounded-xl p-4 flex items-start gap-4">
                  {s === "open" ? <CircleDot className="size-5 text-success mt-0.5" /> : <CircleCheck className="size-5 text-primary mt-0.5" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap"><span className="text-muted-foreground text-sm">#{i.number}</span><span className="font-medium">{i.title}</span></div>
                    <div className="text-xs text-muted-foreground mt-1">@{i.author} · {i.age}</div>
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {i.labels.map((l: string) => <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>)}
                    </div>
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
