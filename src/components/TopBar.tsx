import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search, Bell, RefreshCw, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/CommandPalette";
import { NavBreadcrumb } from "@/components/NavBreadcrumb";
import { emitSync } from "@/lib/sync";
import { toast } from "sonner";

export function TopBar() {
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
      {/* Left: segmented breadcrumb — Org ▾ / Project ▾ */}
      <NavBreadcrumb />

      <div className="flex-1" />

      {/* Right cluster: search, sync, notifications */}
      <button
        onClick={() => setOpen(true)}
        className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-surface text-xs text-muted-foreground hover:border-border-strong transition-colors min-w-[160px]"
        aria-label="Search"
      >
        <Search className="size-3.5 shrink-0" />
        <span>Search…</span>
        <span className="ml-auto flex items-center gap-0.5 text-[10px] opacity-60">
          <Command className="size-3" /> K
        </span>
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden size-9"
        onClick={() => setOpen(true)}
        aria-label="Search"
      >
        <Search className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="size-9"
        aria-label="Sync"
        onClick={() => { emitSync(); toast.success("Syncing data…"); }}
      >
        <RefreshCw className="size-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="size-9 relative"
        aria-label="Notifications"
        onClick={() => navigate({ to: "/notifications" })}
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-danger text-[9px] text-white flex items-center justify-center">
            {unread}
          </span>
        )}
      </Button>

      <CommandPalette open={open} onOpenChange={setOpen} />
    </header>
  );
}
