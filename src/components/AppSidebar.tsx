import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FolderGit2, GitCommit, Rocket, GitPullRequest, Bug,
  Users, BarChart3, Bell, Settings, ChevronsUpDown, LogOut, User as UserIcon
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { useAuth, signOut } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/projects", icon: FolderGit2, label: "Projects" },
  { to: "/commits", icon: GitCommit, label: "Commits" },
  { to: "/deployments", icon: Rocket, label: "Deployments" },
  { to: "/pulls", icon: GitPullRequest, label: "Pull Requests" },
  { to: "/issues", icon: Bug, label: "Issues" },
  { to: "/team", icon: Users, label: "Team" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

export function AppSidebar() {
  const [hovered, setHovered] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const expanded = hovered;

  const initials = (user?.email ?? "DA").slice(0, 2).toUpperCase();
  const avatar = (user?.user_metadata as Record<string, string> | undefined)?.avatar_url;
  const name = (user?.user_metadata as Record<string, string> | undefined)?.user_name || user?.email || "Guest";

  return (
    <>
      {/* Desktop / tablet sidebar */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setProfileOpen(false); }}
        className={cn(
          "hidden md:flex fixed left-0 top-0 z-40 h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out",
          expanded ? "w-[220px]" : "w-[56px]"
        )}
      >
        <div className="flex h-14 items-center px-3 border-b border-sidebar-border overflow-hidden">
          <Logo withWordmark={expanded} />
        </div>

        <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin">
          {NAV.map((item) => {
            const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group relative flex items-center gap-3 mx-2 my-0.5 px-2.5 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                )}
              >
                {active && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
                )}
                <Icon className="size-4 shrink-0" />
                <span className={cn(
                  "whitespace-nowrap transition-opacity duration-150",
                  expanded ? "opacity-100" : "opacity-0 pointer-events-none"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Profile pop trigger */}
        <div className="border-t border-sidebar-border p-2 relative">
          <button
            onMouseEnter={() => setProfileOpen(true)}
            onClick={() => setProfileOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-1.5 py-1.5 rounded-lg hover:bg-sidebar-accent/60 transition-colors"
          >
            <Avatar className="size-7">
              {avatar && <AvatarImage src={avatar} />}
              <AvatarFallback className="bg-primary/20 text-primary-foreground text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className={cn(
              "flex-1 min-w-0 text-left transition-opacity duration-150",
              expanded ? "opacity-100" : "opacity-0 pointer-events-none"
            )}>
              <div className="text-xs font-medium truncate">{name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{user ? "Online" : "Not signed in"}</div>
            </div>
            {expanded && <ChevronsUpDown className="size-3.5 text-muted-foreground" />}
          </button>

          {profileOpen && (
            <div
              onMouseLeave={() => setProfileOpen(false)}
              className="absolute bottom-14 left-2 right-2 glass rounded-lg p-2 shadow-2xl animate-fade-up z-50"
            >
              <Link to="/settings" className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-sidebar-accent/60">
                <UserIcon className="size-4" /> Profile
              </Link>
              {user ? (
                <button onClick={() => signOut()} className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-sidebar-accent/60 text-danger">
                  <LogOut className="size-4" /> Sign out
                </button>
              ) : (
                <Link to="/login" className="flex items-center gap-2 px-2 py-1.5 rounded text-sm hover:bg-sidebar-accent/60">
                  <UserIcon className="size-4" /> Sign in
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-sidebar/95 backdrop-blur">
        <div className="flex justify-around py-2">
          {NAV.slice(0, 5).map((item) => {
            const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg text-[10px]",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="size-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
