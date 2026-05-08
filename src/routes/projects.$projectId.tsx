import { createFileRoute, Outlet, useParams, Link } from "@tanstack/react-router";
import { ProjectSidebar, ProjectMobileNav } from "@/components/ProjectSidebar";
import { useProject } from "@/lib/use-project";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/projects/$projectId")({
  component: ProjectLayout,
});

function ProjectLayout() {
  const { projectId } = useParams({ from: "/projects/$projectId" });
  const { project, loading } = useProject(projectId);

  return (
    <div>
      <Link to="/projects" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3">
        <ArrowLeft className="size-3.5" /> All Projects
      </Link>
      <ProjectMobileNav projectId={projectId} />
      <div className="flex gap-6">
        <ProjectSidebar projectId={projectId} name={project ? `${project.owner}/${project.repo}` : projectId} />
        <div className="flex-1 min-w-0">
          {loading && !project ? (
            <div className="glass rounded-xl p-6 text-sm text-muted-foreground">Loading project…</div>
          ) : !project ? (
            <div className="glass rounded-xl p-6 text-sm text-muted-foreground">Project not found.</div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
}
