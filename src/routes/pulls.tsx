import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./index";
import { GitPullRequest } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { getSelectedImportedProject } from "@/lib/imported-projects";
import { listPulls } from "@/lib/github/client";
import { formatDistanceToNow } from "date-fns";

type PRRow = {
  number: number;
  title: string;
  state: "open" | "closed" | "merged";
  author: string;
  base: string;
  head: string;
  additions: number;
  deletions: number;
  changed: number;
  age: string;
  labels: string[];
  reviewers: string[];
};

export const Route = createFileRoute("/pulls")({
  head: () => ({ meta: [{ title: "Pull Requests — DevANT" }] }),
  component: Pulls,
});

function Pulls() {
  const { user } = useAuth();
  const [pulls, setPulls] = useState<PRRow[]>([]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) return;
      const selected = await getSelectedImportedProject(user.id);
      const token = getGitHubToken(user);
      if (!selected || !token) {
        setPulls([]);
        return;
      }

      try {
        const list = await listPulls(token, selected.owner, selected.repo, "all");
        if (!mounted) return;
        setPulls(
          list.map((p: any) => ({
            number: p.number,
            title: p.title,
            state: p.merged_at ? "merged" : p.state === "closed" ? "closed" : "open",
            author: p.user?.login ?? "unknown",
            base: p.base?.ref ?? "-",
            head: p.head?.ref ?? "-",
            additions: p.additions ?? 0,
            deletions: p.deletions ?? 0,
            changed: p.changed_files ?? 0,
            age: p.updated_at ? formatDistanceToNow(new Date(p.updated_at), { addSuffix: true }) : "-",
            labels: Array.isArray(p.labels)
              ? p.labels.map((l: any) => (typeof l === "string" ? l : l.name)).filter(Boolean)
              : [],
            reviewers: Array.isArray(p.requested_reviewers) ? p.requested_reviewers.map((r: any) => r.login).filter(Boolean) : [],
          }))
        );
      } catch (err) {
        console.error("Failed to load pull requests", err);
        setPulls([]);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  const filter = (state: string) => (state === "all" ? pulls : pulls.filter((p) => p.state === state));

  return (
    <>
      <PageHeader title="Pull Requests" description="All open, merged and closed PRs." />

      {!user ? (
        <div className="glass rounded-xl p-6">Sign in and import a project first.</div>
      ) : pulls.length === 0 ? (
        <div className="glass rounded-xl p-6">No pull request data yet. Import a project from New Project+ first.</div>
      ) : null}

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="closed">Closed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        {["open", "closed", "all"].map((state) => (
          <TabsContent key={state} value={state}>
            <div className="space-y-2 mt-4">
              {filter(state).map((p) => (
                <div key={p.number} className="glass glass-hover rounded-xl p-4 flex items-start gap-4 animate-fade-up">
                  <GitPullRequest className={`size-5 mt-0.5 shrink-0 ${p.state === "merged" ? "text-primary" : p.state === "closed" ? "text-danger" : "text-success"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground text-sm">#{p.number}</span>
                      <span className="font-medium">{p.title}</span>
                      <StatusBadge status={p.state} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5 flex-wrap">
                      <span>@{p.author}</span>
                      <span>·</span>
                      <span className="font-mono">{p.base} ← {p.head}</span>
                      <span>·</span>
                      <span className="text-success">+{p.additions}</span>
                      <span className="text-danger">-{p.deletions}</span>
                      <span>·</span>
                      <span>{p.changed} files</span>
                      <span>·</span>
                      <span>{p.age}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                      {p.labels.map((l) => (
                        <Badge key={l} variant="outline" className="text-[10px]">{l}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex -space-x-2 shrink-0">
                    {p.reviewers.map((r) => (
                      <Avatar key={r} className="size-6 border-2 border-background">
                        <AvatarFallback className="text-[10px]">{r[0].toUpperCase()}</AvatarFallback>
                      </Avatar>
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
