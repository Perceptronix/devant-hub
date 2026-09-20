import { useEffect, useState } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, FolderGit2, BarChart3, Bell,
  ChevronsUpDown, LogOut, User as UserIcon, Menu, X, HeartPulse,
  Settings, Moon, Sun,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { useAuth, signOut, signInWithGitHub } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Settings is intentionally NOT in NAV — it lives in the account dropdown only.
const NAV = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/projects", icon: FolderGit2, label: "Projects" },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/health", icon: HeartPulse, label: "Health" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
] as const;

export function AppSidebar() {
  const [hovered, setHovered] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const [theme, setTheme] = useTheme();
  const navigate = useNavigate();
  const expanded = hovered;

  useEffect(() => { setMobileOpen(false); }, [path]);

  const initials = (user?.email ?? "DA").slice(0, 2).toUpperCase();
  const meta = (user?.user_metadata as Record<string, string> | undefined) ?? {};
  const avatar = meta.avatar_url;
  const name = meta.user_name || user?.email || "Guest";
  const email = user?.email ?? "";

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
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent/60"
            )}
          >
            {active && (
              <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
            )}
            <Icon className="size-4 shrink-0" />
            <span
              className={cn(
                "whitespace-nowrap transition-opacity duration-150",
                expanded || onClick ? "opacity-100" : "opacity-0 pointer-events-none"
              )}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </>
  );

  // Account dropdown — Supabase-style: avatar trigger, Settings + theme + sign out
  const AccountDropdown = ({ inline }: { inline?: boolean }) => (
    <div className="border-t border-sidebar-border p-2">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors text-left",
            "hover:bg-sidebar-accent/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
          )}
        >
          <Avatar className="size-7 shrink-0">
            {avatar && <AvatarImage src={avatar} />}
            <AvatarFallback className="bg-primary/20 text-[10px] font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div
            className={cn(
              "flex-1 min-w-0 transition-opacity duration-150",
              expanded || inline ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
          >
            <div className="text-xs font-semibold truncate text-sidebar-foreground leading-tight">
              {name}
            </div>
            <div className="text-[10px] text-muted-foreground truncate leading-tight">
              {user ? "Online" : "Not signed in"}
            </div>
          </div>
          <ChevronsUpDown
            className={cn(
              "size-3.5 text-muted-foreground shrink-0 transition-opacity duration-150",
              expanded || inline ? "opacity-100" : "opacity-0"
            )}
          />
        </DropdownMenuTrigger>

        <DropdownMenuContent
          side="right"
          align="end"
          sideOffset={8}
          className="w-56"
        >
          {/* User header — plain div, not a group label (GroupLabel requires Group context) */}
          <div className="flex items-center gap-2.5 px-2 py-1.5">
            <Avatar className="size-7 shrink-0">
              {avatar && <AvatarImage src={avatar} />}
              <AvatarFallback className="bg-primary/20 text-[10px] font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="text-xs font-semibold truncate">{name}</div>
              {email && (
                <div className="text-[10px] text-muted-foreground truncate">{email}</div>
              )}
            </div>
          </div>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={() => { navigate({ to: "/settings" }); setMobileOpen(false); }}
            className="gap-2 cursor-pointer"
          >
            <Settings className="size-3.5" />
            Settings
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="gap-2 cursor-pointer"
          >
            {theme === "dark"
              ? <Sun className="size-3.5" />
              : <Moon className="size-3.5" />
            }
            {theme === "dark" ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {user ? (
            <DropdownMenuItem
              onClick={() => { signOut(); setMobileOpen(false); }}
              className="gap-2 cursor-pointer text-danger focus:text-danger focus:bg-danger/10"
            >
              <LogOut className="size-3.5" />
              Sign out
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => { signInWithGitHub(); setMobileOpen(false); }}
              className="gap-2 cursor-pointer text-primary focus:text-primary focus:bg-primary/10"
            >
              <UserIcon className="size-3.5" />
              Sign in with GitHub
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
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
        <nav className="flex-1 py-3 overflow-y-auto scrollbar-thin">
          <NavList />
        </nav>
        <AccountDropdown />
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
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute left-0 top-0 bottom-0 w-[260px] bg-sidebar border-r border-sidebar-border flex flex-col animate-fade-up">
            <div className="flex items-center justify-between h-14 px-3 border-b border-sidebar-border">
              <Logo />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen(false)}
              >
                <X className="size-5" />
              </Button>
            </div>
            <nav className="flex-1 py-3 overflow-y-auto">
              <NavList onClick={() => setMobileOpen(false)} />
            </nav>
            <AccountDropdown inline />
          </div>
        </div>
      )}
    </>
  );
}
