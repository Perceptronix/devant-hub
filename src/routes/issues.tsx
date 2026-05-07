import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { demoIssues } from "@/lib/demo-data";
import { Badge } from "@/components/ui/badge";
import { Bug, CircleCheck, CircleDot } from "lucide-react";

export const Route = createFileRoute("/issues")({
  head: () => ({ meta: [{ title: "Issues — DevANT" }] }),
  component: Issues,
});

function Issues() {
  const f = (s: string) => demoIssues.filter((i) => i.state === s);
  return (
    <>
      <PageHeader title="Issues" description="Track open bugs and feature requests across projects." />
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
