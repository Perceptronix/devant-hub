import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FolderGit2, BarChart3, Bell, Settings,
  ChevronsUpDown, LogOut, User as UserIcon, Menu, X,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { useAuth, signOut, signInWithGitHub } from "@/lib/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/projects", icon: FolderGit2, label: "Projects" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/settings", icon: Settings, label: "Settings" },
] as const;

export function AppSidebar() {
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const expanded = hovered;

  useEffect(() => { setMobileOpen(false); }, [path]);

  const initials = (user?.email ?? "DA").slice(0, 2).toUpperCase();
  const meta = (user?.user_metadata as Record<string, string> | undefined) ?? {};
  const avatar = meta.avatar_url;
  const name = meta.user_name || user?.email || "Guest";

  const NavList = ({ onClick }: { onClick?: () => void }) => (
    <>
      {NAV.map((item) => {
        const active = item.to === "/" ? path === "/" : path.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClick}
            className={cn(
              "group relative flex items-center gap-3 mx-2 my-0.5 px-2.5 py-2 rounded-lg text-sm transition-colors",
              active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60"
            )}
          >
            {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />}
            <Icon className="size-4 shrink-0" />
            <span className={cn("whitespace-nowrap transition-opacity duration-150", expanded || onClick ? "opacity-100" : "opacity-0 pointer-events-none")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </>
  );

  const ProfileBlock = ({ inline }: { inline?: boolean }) => (
    <div className="border-t border-sidebar-border p-3 space-y-2">
      <div className={cn("flex items-center gap-3 px-2 py-2 rounded-lg transition-colors", inline && "bg-sidebar-accent/40")}>
        <Avatar className="size-9 shrink-0">
          {avatar && <AvatarImage src={avatar} />}
          <AvatarFallback className="bg-primary/20 text-xs font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold truncate text-sidebar-foreground">{name}</div>
          <div className="text-[11px] text-muted-foreground truncate">{user ? "Online" : "Not signed in"}</div>
        </div>
        {expanded || inline ? <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0" /> : null}
      </div>
      
      {expanded || inline ? (
        <div className="space-y-1 pt-1">
          <Link 
            to="/settings" 
            onClick={() => setMobileOpen(false)} 
            className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors group"
          >
            <UserIcon className="size-4 group-hover:text-primary" /> 
            <span>Profile & Settings</span>
          </Link>
          {user ? (
            <button 
              onClick={() => { signOut(); setMobileOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-danger hover:bg-danger/10 transition-colors group"
            >
              <LogOut className="size-4" /> 
              <span>Sign Out</span>
            </button>
          ) : (
            <button 
              onClick={() => { signInWithGitHub(); setMobileOpen(false); }}
              className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs text-primary hover:bg-primary/10 transition-colors group"
            >
              <UserIcon className="size-4" /> 
              <span>Sign in with GitHub</span>
            </button>
          )}
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {/* Desktop / tablet hover sidebar */}
      <aside
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          "hidden md:flex fixed left-0 top-0 z-40 h-screen flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out",
          expanded ? "w-[220px]" : "w-[56px]"
        )}
      >
        <div className="flex h-14 items-center px-3 border-b border-sidebar-border overflow-hidden">
          <Logo withWordmark={expanded} />
        </div>
        <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin"><NavList /></nav>
        <ProfileBlock />
      </aside>

      {/* Mobile menu trigger (top-left) */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 size-10 rounded-lg glass flex items-center justify-center"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-sidebar border-r border-sidebar-border flex flex-col animate-fade-up">
            <div className="flex items-center justify-between h-14 px-3 border-b border-sidebar-border">
              <Logo />
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}><X className="size-5" /></Button>
            </div>
            <nav className="flex-1 py-3 overflow-y-auto"><NavList onClick={() => setMobileOpen(false)} /></nav>
            <ProfileBlock inline />
          </div>
        </div>
      )}
    </>
  );
}
