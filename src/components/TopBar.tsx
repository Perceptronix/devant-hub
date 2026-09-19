import { useEffect, useState } from "react";
import { useRouterState, Link, useNavigate } from "@tanstack/react-router";
import { Search, Bell, RefreshCw, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/CommandPalette";
import { OrgSwitcher } from "@/components/OrgSwitcher";
import { emitSync } from "@/lib/sync";
import { toast } from "sonner";

function toCrumbs(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return [{ label: "Dashboard", to: "/" }];
  return [
    { label: "DevANT", to: "/" },
    ...parts.map((p, i) => ({
      label: decodeURIComponent(p).replace(/-/g, " "),
      to: "/" + parts.slice(0, i + 1).join("/"),
    })),
  ];
}

export function TopBar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const crumbs = toCrumbs(path);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    function refresh() {
      try {
        const raw = window.localStorage.getItem("devant.notifications.unread");
        setUnread(raw ? parseInt(raw, 10) || 0 : 0);
      } catch { setUnread(0); }
    }
    refresh();
    window.addEventListener("devant:notifications-changed", refresh);
    return () => window.removeEventListener("devant:notifications-changed", refresh);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-14 border-b border-border bg-background/80 backdrop-blur-xl flex items-center px-4 gap-3 pl-16 md:pl-4">
      <div className="hidden md:flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
        {crumbs.map((c, i) => (
          <div key={c.to} className="flex items-center gap-1.5 min-w-0">
            {i > 0 && <span className="text-border-strong">/</span>}
            <Link to={c.to as any} className="hover:text-foreground capitalize truncate">{c.label}</Link>
          </div>
        ))}
      </div>
      <div className="md:ml-2"><OrgSwitcher /></div>
      <div className="flex-1" />

      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface text-xs text-muted-foreground hover:border-border-strong transition-colors min-w-[200px]"
      >
        <Search className="size-3.5" />
        <span>Search…</span>
        <span className="ml-auto flex items-center gap-0.5 text-[10px]"><Command className="size-3" /> K</span>
      </button>
      <Button variant="ghost" size="icon" className="sm:hidden size-9" onClick={() => setOpen(true)} aria-label="Search"><Search className="size-4" /></Button>

      <Button variant="ghost" size="icon" className="size-9" aria-label="Sync" onClick={() => { emitSync(); toast.success("Syncing data…"); }}>
        <RefreshCw className="size-4" />
      </Button>
      <Button variant="ghost" size="icon" className="size-9 relative" aria-label="Notifications" onClick={() => navigate({ to: "/notifications" })}>
        <Bell className="size-4" />
        {unread > 0 && <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-danger text-[9px] text-white flex items-center justify-center">{unread}</span>}
      </Button>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </header>
  );
}
