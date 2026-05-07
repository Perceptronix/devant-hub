import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { demoPRs } from "@/lib/demo-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "./index";
import { GitPullRequest } from "lucide-react";

export const Route = createFileRoute("/pulls")({
  head: () => ({ meta: [{ title: "Pull Requests — DevANT" }] }),
  component: Pulls,
});

function Pulls() {
  const filter = (state: string) =>
    state === "all" ? demoPRs : demoPRs.filter((p) => p.state === state);

  return (
    <>
      <PageHeader title="Pull Requests" description="All open, merged and closed PRs." />

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
                      <span>{p.age} ago</span>
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
