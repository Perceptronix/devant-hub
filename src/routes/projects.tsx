import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, GitPullRequest, Bug, Clock, ExternalLink, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { demoProjects, demoDepartments } from "@/lib/demo-data";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects — DevANT" }] }),
  component: Projects,
});

function Projects() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <PageHeader
        title="Projects"
        description="All repositories linked across your organization."
        action={<Button onClick={() => setOpen(true)} className="gap-1.5"><Plus className="size-4" /> Link Repository</Button>}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {demoProjects.map((p) => {
          const dept = demoDepartments.find((d) => d.name === p.dept);
          return (
            <div key={p.id} className="glass glass-hover rounded-xl p-5 animate-fade-up">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Link to="/commits" className="font-display font-semibold text-lg hover:text-primary transition-colors">{p.name}</Link>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{p.owner}/{p.repo}</div>
                </div>
                <Badge variant="outline" className="text-xs" style={{ borderColor: dept?.color, color: dept?.color }}>
                  {dept?.icon} {p.dept}
                </Badge>
              </div>

              <div className="text-sm bg-surface-elevated rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <code className="font-mono">{p.lastSha}</code>
                  <Clock className="size-3 ml-auto" /> {p.lastSync}
                </div>
                <div className="text-foreground truncate">{p.lastMsg}</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><GitPullRequest className="size-3.5" /> {p.openPRs}</span>
                  <span className="flex items-center gap-1"><Bug className="size-3.5" /> {p.openIssues}</span>
                </div>
                <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs"><RefreshCw className="size-3" /> Sync</Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Link a Repository</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Search your GitHub repos…" />
            <div className="text-xs text-muted-foreground">
              Sign in with GitHub to enable repo search and webhook registration.
            </div>
            <Input placeholder="Or paste owner/repo manually" />
            <Button className="w-full gap-1.5"><ExternalLink className="size-4" /> Link Repository</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
