import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Unlink, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useProject } from "@/lib/use-project";
import { removeImportedProject } from "@/lib/imported-projects";
import { emitSync } from "@/lib/sync";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/projects/$projectId/settings")({
  component: ProjectSettings,
});

function ProjectSettings() {
  const { projectId } = useParams({ from: "/projects/$projectId/settings" });
  const { project } = useProject(projectId);
  const { user } = useAuth();
  const navigate = useNavigate();
  const [disconnecting, setDisconnecting] = useState(false);

  async function disconnect() {
    if (!user || !project) return;
    setDisconnecting(true);
    const ok = await removeImportedProject(user.id, project.id);
    setDisconnecting(false);
    if (ok) navigate({ to: "/projects" });
  }

  if (!project) return null;

  return (
    <>
      <h1 className="text-2xl font-display font-bold mb-4">Project Settings</h1>

      <div className="glass rounded-xl p-5 mb-4 max-w-2xl">
        <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Repository</div>
        <div className="font-mono">{project.owner}/{project.repo}</div>
        <div className="text-xs text-muted-foreground mt-1">Default branch: {project.defaultBranch ?? "main"}</div>
      </div>

      <div className="glass rounded-xl p-5 mb-4 max-w-2xl">
        <div className="text-xs uppercase text-muted-foreground tracking-wider mb-2">Sync</div>
        <p className="text-sm text-muted-foreground mb-3">Refetch live data from GitHub for this project.</p>
        <Button variant="outline" className="gap-1.5" onClick={() => emitSync(project.id)}>
          <RefreshCw className="size-4" /> Sync now
        </Button>
      </div>

      <div className="glass rounded-xl p-5 max-w-2xl border-danger/40">
        <h2 className="font-display font-semibold text-danger mb-2">Danger zone</h2>
        <p className="text-sm text-muted-foreground mb-3">Disconnect this project from DevANT. The repository on GitHub is not affected.</p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="gap-1.5"><Unlink className="size-4" /> Disconnect project</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Disconnect {project.owner}/{project.repo}?</AlertDialogTitle>
              <AlertDialogDescription>This removes it from DevANT. You can re-import it any time.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={disconnect} disabled={disconnecting}>{disconnecting ? "Disconnecting…" : "Disconnect"}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
