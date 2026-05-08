import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, GitCommit, Rocket, GitPullRequest, Bug, Users, Settings, MessageCircle, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { to: string; label: string; icon: React.ComponentType<{ className?: string }>; exact?: boolean };
const ITEMS: Item[] = [
  { to: "/projects/$projectId", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/projects/$projectId/commits", label: "Commits", icon: GitCommit },
  { to: "/projects/$projectId/deployments", label: "Deployments", icon: Rocket },
  { to: "/projects/$projectId/pulls", label: "Pull Requests", icon: GitPullRequest },
  { to: "/projects/$projectId/issues", label: "Issues", icon: Bug },
  { to: "/projects/$projectId/team", label: "Team", icon: Users },
  { to: "/projects/$projectId/messaging", label: "Messages", icon: MessageCircle },
  { to: "/projects/$projectId/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/projects/$projectId/settings", label: "Settings", icon: Settings },
];

export function ProjectSidebar({ projectId, name }: { projectId: string; name?: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="hidden md:block w-[200px] shrink-0">
      <nav className="glass rounded-xl p-2 sticky top-20">
        {name && (
          <div className="px-3 py-2 mb-1 border-b border-border">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Project</div>
            <div className="text-sm font-display font-semibold truncate">{name}</div>
          </div>
        )}
        {ITEMS.map((it) => {
          const href = it.to.replace("$projectId", projectId);
          const active = it.exact ? path === href : path === href || path.startsWith(href + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to as any}
              params={{ projectId } as any}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors my-0.5",
                active ? "bg-primary/15 text-primary" : "text-foreground/80 hover:bg-surface-elevated"
              )}
            >
              <Icon className="size-4" /> {it.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function ProjectMobileNav({ projectId }: { projectId: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="md:hidden -mx-4 px-4 pb-4 overflow-x-auto scrollbar-thin">
      <div className="flex gap-1 min-w-max">
        {ITEMS.map((it) => {
          const href = it.to.replace("$projectId", projectId);
          const active = it.exact ? path === href : path === href || path.startsWith(href + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to as any}
              params={{ projectId } as any}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-full text-xs whitespace-nowrap border transition-all font-medium",
                active 
                  ? "bg-primary/15 text-primary border-primary/40 shadow-sm shadow-primary/10" 
                  : "border-border text-foreground/80 hover:bg-surface-elevated hover:border-border-strong"
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
