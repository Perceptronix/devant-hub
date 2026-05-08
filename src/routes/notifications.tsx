import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Bell, Check, Mail, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { fetchImportedProjects } from "@/lib/imported-projects";
import { listIssues, listPulls, listDeployments } from "@/lib/github/client";
import { getReadIds, markRead } from "@/lib/notifications-store";
import { useSyncListener, emitSync } from "@/lib/sync";
import { getSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type N = { id: string; type: string; text: string; time: string; read: boolean; ts: number };
type OrgInvite = { id: string; org_id: string; org_name: string; invited_by: string; invited_at: string; status: string };

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications — DevANT" }] }),
  component: Notifications,
});

function Notifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [invites, setInvites] = useState<OrgInvite[]>([]);
  const [tick, setTick] = useState(0);
  const [respondingTo, setRespondingTo] = useState<string | null>(null);
  useSyncListener(() => setTick((n) => n + 1));

  // Load pending org invites by email match
  useEffect(() => {
    if (!user?.email) {
      setInvites([]);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const supabase = getSupabase();
        // Query pending invites matching the user's email
        const { data, error } = await supabase
          .from("org_members")
          .select("id, org_id, status, invited_at, organizations(name)")
          .eq("invited_email", user.email.toLowerCase())
          .eq("status", "pending")
          .order("invited_at", { ascending: false });

        if (!mounted) return;
        if (error) {
          console.error("Failed to load org invites:", error);
          return;
        }

        const pendingInvites = (data || []).map((row: any) => ({
          id: row.id,
          org_id: row.org_id,
          org_name: row.organizations?.name || "Unknown Organization",
          invited_by: row.invited_by,
          invited_at: row.invited_at,
          status: row.status,
        }));

        setInvites(pendingInvites);
      } catch (err) {
        console.error("Error loading org invites:", err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [user?.email, tick]);

  // Load GitHub notifications
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) { setItems([]); return; }
      const projects = await fetchImportedProjects(user.id);
      const token = getGitHubToken(user);
      if (!token || projects.length === 0) { setItems([]); return; }

      const all: N[] = [];
      const read = getReadIds();
      for (const p of projects) {
        const [pulls, issues, deploys] = await Promise.all([
          listPulls(token, p.owner, p.repo, "all").catch(() => []),
          listIssues(token, p.owner, p.repo, "all").catch(() => []),
          listDeployments(token, p.owner, p.repo).catch(() => []),
        ]);
        for (const pr of (pulls ?? []).slice(0, 5)) all.push({ id: `pr-${pr.id}`, type: "PR", text: `${p.repo}: #${pr.number} ${pr.title}`, time: pr.updated_at ? formatDistanceToNow(new Date(pr.updated_at), { addSuffix: true }) : "-", read: read.has(`pr-${pr.id}`), ts: pr.updated_at ? new Date(pr.updated_at).getTime() : 0 });
        for (const i of (issues ?? []).filter((x: any) => !x.pull_request).slice(0, 5)) all.push({ id: `is-${i.id}`, type: "Issue", text: `${p.repo}: #${i.number} ${i.title}`, time: i.updated_at ? formatDistanceToNow(new Date(i.updated_at), { addSuffix: true }) : "-", read: read.has(`is-${i.id}`), ts: i.updated_at ? new Date(i.updated_at).getTime() : 0 });
        for (const d of (deploys ?? []).slice(0, 5)) all.push({ id: `dp-${d.id}`, type: "Deploy", text: `${p.repo}: ${d.environment ?? "preview"} on ${d.ref}`, time: d.created_at ? formatDistanceToNow(new Date(d.created_at), { addSuffix: true }) : "-", read: read.has(`dp-${d.id}`), ts: d.created_at ? new Date(d.created_at).getTime() : 0 });
      }
      if (!mounted) return;
      const sorted = all.sort((a, b) => b.ts - a.ts).slice(0, 30);
      setItems(sorted);
      try { window.localStorage.setItem("devant.notifications.unread", String(sorted.filter((n) => !n.read).length)); } catch { /* noop */ }
      window.dispatchEvent(new CustomEvent("devant:notifications-changed"));
    })();
    return () => { mounted = false; };
  }, [user, tick]);

  async function handleInviteResponse(inviteId: string, accept: boolean) {
    if (!user) return;
    setRespondingTo(inviteId);
    try {
      const supabase = getSupabase();
      const status = accept ? "accepted" : "declined";
      const updates = accept
        ? { 
            status, 
            user_id: user.id, // Link user when accepting
            joined_at: new Date().toISOString() 
          }
        : { status };

      const { error } = await supabase
        .from("org_members")
        .update(updates)
        .eq("id", inviteId);

      if (error) {
        console.error("Failed to respond to invite:", error);
        toast.error(accept ? "Failed to accept invite" : "Failed to decline invite");
        return;
      }

      toast.success(accept ? "Invite accepted! You've joined the organization." : "Invite declined");
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      emitSync();
    } catch (err) {
      console.error("Error responding to invite:", err);
      toast.error("Something went wrong");
    } finally {
      setRespondingTo(null);
    }
  }

  function markAll() {
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    if (ids.length === 0) return;
    markRead(ids);
    setItems((cur) => cur.map((n) => ({ ...n, read: true })));
    try { window.localStorage.setItem("devant.notifications.unread", "0"); } catch { /* noop */ }
    window.dispatchEvent(new CustomEvent("devant:notifications-changed"));
  }

  return (
    <>
      <PageHeader title="Notifications" action={<Button variant="outline" size="sm" className="gap-1.5" onClick={markAll}><Check className="size-4" /> Mark all read</Button>} />
      {!user && <div className="glass rounded-xl p-6 text-sm text-muted-foreground">Sign in to view notifications.</div>}
      <div className="space-y-2">
        {/* Pending Organization Invites */}
        {invites.length > 0 && (
          <>
            <div className="text-sm font-semibold text-muted-foreground px-1 pt-4">Organization Invites</div>
            {invites.map((inv) => (
              <div key={inv.id} className="glass glass-hover rounded-xl p-4 flex items-start gap-3">
                <div className="size-9 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                  <Mail className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">Invited to <strong>{inv.org_name}</strong></div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {formatDistanceToNow(new Date(inv.invited_at), { addSuffix: true })}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 h-8"
                    onClick={() => handleInviteResponse(inv.id, true)}
                    disabled={respondingTo === inv.id}
                  >
                    <CheckCircle className="size-3.5" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 h-8 text-destructive hover:text-destructive"
                    onClick={() => handleInviteResponse(inv.id, false)}
                    disabled={respondingTo === inv.id}
                  >
                    <XCircle className="size-3.5" />
                    Decline
                  </Button>
                </div>
              </div>
            ))}
          </>
        )}

        {/* GitHub Notifications */}
        {items.length > 0 && <div className="text-sm font-semibold text-muted-foreground px-1 pt-4">GitHub Activity</div>}
        {user && items.length === 0 && invites.length === 0 && <div className="glass rounded-xl p-6 text-sm text-muted-foreground">No notifications yet.</div>}
        {items.map((n) => (
          <div key={n.id} className={`glass glass-hover rounded-xl p-4 flex items-start gap-3 ${!n.read ? "border-primary/30" : ""}`}>
            <div className="size-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center"><Bell className="size-4" /></div>
            <div className="flex-1 min-w-0">
              <div className="text-sm">{n.text}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{n.type} · {n.time}</div>
            </div>
            {!n.read && <span className="size-2 rounded-full bg-primary mt-2" />}
          </div>
        ))}
      </div>
    </>
  );
}
