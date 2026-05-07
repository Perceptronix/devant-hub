import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CircleCheck, CircleDot } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { getSelectedImportedProject } from "@/lib/imported-projects";
import { listIssues } from "@/lib/github/client";

type IssueRow = {
  number: number;
  title: string;
  author: string;
  age: string;
  labels: string[];
  state: "open" | "closed";
};

export const Route = createFileRoute("/issues")({
  head: () => ({ meta: [{ title: "Issues — DevANT" }] }),
  component: Issues,
});

function Issues() {
  const { user } = useAuth();
  const [issues, setIssues] = useState<IssueRow[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) return;
      const selected = getSelectedImportedProject(user.id);
      const token = getGitHubToken(user);
      if (!selected || !token) {
        setIssues([]);
        return;
      }

      try {
        const list = await listIssues(token, selected.owner, selected.repo, "all");
        if (!mounted) return;
        setIssues(
          list
            .filter((i: any) => !i.pull_request)
            .map((i: any) => ({
              number: i.number,
              title: i.title,
              author: i.user?.login ?? "unknown",
              age: i.updated_at ? new Date(i.updated_at).toLocaleString() : "-",
              labels: Array.isArray(i.labels) ? i.labels.map((l: any) => (typeof l === "string" ? l : l.name)).filter(Boolean) : [],
              state: i.state === "closed" ? "closed" : "open",
            }))
        );
      } catch (err) {
        console.error("Failed to load issues", err);
        setIssues([]);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  const f = (s: string) => issues.filter((i) => i.state === s);

  return (
    <>
      <PageHeader title="Issues" description="Track open bugs and feature requests across projects." />
      {!user ? (
        <div className="glass rounded-xl p-6">Sign in and import a project first.</div>
      ) : issues.length === 0 ? (
        <div className="glass rounded-xl p-6">No issue data yet. Import a project from New Project+ first.</div>
      ) : null}
      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open ({f("open").length})</TabsTrigger>
          <TabsTrigger value="closed">Closed ({f("closed").length})</TabsTrigger>
        </TabsList>
        {["open", "closed"].map((s) => (
          <TabsContent key={s} value={s}>
            <div className="space-y-2 mt-4">
              {f(s).map((i) => (
                <div key={i.number} className="glass glass-hover rounded-xl p-4 flex items-start gap-4 animate-fade-up">
                  {s === "open" ? <CircleDot className="size-5 text-success mt-0.5" /> : <CircleCheck className="size-5 text-primary mt-0.5" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground text-sm">#{i.number}</span>
                      <span className="font-medium">{i.title}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                      <span>@{i.author}</span>
                      <span>·</span>
                      <span>{i.age} ago</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {i.labels.map((l) => (
                        <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>
                      ))}
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
