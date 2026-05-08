import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { LayoutDashboard, FolderGit2, BarChart3, Settings, Bell, FolderOpen } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { fetchImportedProjects, type ImportedProject } from "@/lib/imported-projects";

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<ImportedProject[]>([]);

  useEffect(() => {
    if (!user || !open) return;
    fetchImportedProjects(user.id).then(setProjects);
  }, [user, open]);

  const go = (fn: () => void) => { onOpenChange(false); fn(); };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search…" />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Pages">
          <CommandItem onSelect={() => go(() => navigate({ to: "/" }))}><LayoutDashboard className="size-4 mr-2" /> Dashboard</CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/projects" }))}><FolderGit2 className="size-4 mr-2" /> Projects</CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/analytics" }))}><BarChart3 className="size-4 mr-2" /> Analytics</CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/notifications" }))}><Bell className="size-4 mr-2" /> Notifications</CommandItem>
          <CommandItem onSelect={() => go(() => navigate({ to: "/settings" }))}><Settings className="size-4 mr-2" /> Settings</CommandItem>
        </CommandGroup>
        {projects.length > 0 && (
          <CommandGroup heading="Projects">
            {projects.map((p) => (
              <CommandItem key={p.id} value={`${p.owner}/${p.repo}`} onSelect={() => go(() => navigate({ to: "/projects/$projectId", params: { projectId: p.id } }))}>
                <FolderOpen className="size-4 mr-2" /> {p.owner}/{p.repo}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
