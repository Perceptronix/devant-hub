import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { getImportedProjects, getSelectedImportedProject } from "@/lib/imported-projects";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dashboard — DevANT" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();

  if (!user) {
    return (
      <>
        <PageHeader title="Dashboard" description="Sign in to load your imported projects." />
        <div className="glass rounded-xl p-6 animate-fade-up">
          <p className="text-sm text-muted-foreground">You are not signed in.</p>
        </div>
      </>
    );
  }

  const projects = getImportedProjects(user.id);
  const selected = getSelectedImportedProject(user.id);

  if (projects.length === 0) {
    return (
      <>
        <PageHeader title="Dashboard" description="No data yet. Import repositories to begin." />
        <div className="glass rounded-xl p-6 animate-fade-up">
          <h2 className="font-display font-semibold text-lg">No linked repositories</h2>
          <p className="text-sm text-muted-foreground mt-2">
            After sign-in, data stays empty until you click New Project+ and import a repository.
          </p>
          <Link to="/projects">
            <Button className="gap-1.5 mt-4"><Plus className="size-4" /> Open Projects</Button>
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" description="Live GitHub data is available for your imported repositories." />
      <div className="glass rounded-xl p-6 animate-fade-up">
        <div className="text-sm text-muted-foreground">Imported repositories</div>
        <div className="font-display font-bold text-3xl mt-1">{projects.length}</div>
        <div className="text-sm mt-3">
          Active project: <span className="font-mono">{selected ? `${selected.owner}/${selected.repo}` : `${projects[0].owner}/${projects[0].repo}`}</span>
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          Open Commits, Issues, and Team pages to view live data for the active imported project.
        </div>
      </div>
    </>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    success: "bg-success/15 text-success border-success/30",
    failure: "bg-danger/15 text-danger border-danger/30",
    pending: "bg-warning/15 text-warning border-warning/30",
    in_progress: "bg-cyan/15 text-cyan border-cyan/30 animate-pulse",
    open: "bg-success/15 text-success border-success/30",
    merged: "bg-primary/15 text-primary border-primary/30",
    closed: "bg-danger/15 text-danger border-danger/30",
  };
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded border ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
