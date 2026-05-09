import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, ShieldCheck, ArrowRight, Github } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, signInWithGitHub } from "@/lib/auth";
import { getOrgInviteByToken } from "@/lib/org-invites";
import { getSupabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Invite = {
  id: string;
  orgId: string;
  orgName: string;
  invitedEmail: string;
  invitedAt: string;
  status: string;
  inviteToken?: string;
};

export const Route = createFileRoute("/invites/$token")({
  head: () => ({ meta: [{ title: "Organization invite — DevANT" }] }),
  component: InvitePage,
});

function InvitePage() {
  const { token } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const email = user?.email?.toLowerCase() ?? "";
  const userMeta = (user?.user_metadata as Record<string, string> | undefined) ?? {};
  const githubLogin = userMeta.user_name || userMeta.preferred_username || user?.email || "";
  const displayName = userMeta.full_name || userMeta.user_name || user?.email || invite?.invitedEmail || "";

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getOrgInviteByToken({ data: { token } });
        if (mounted) setInvite(data);
      } catch (error) {
        console.error("Failed to load invite:", error);
        if (mounted) setInvite(null);
      } finally {
        if (mounted) setLoadingInvite(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [token]);

  async function acceptInvite() {
    if (!invite || !user) return;
    if (email && email !== invite.invitedEmail.toLowerCase()) {
      toast.error("Sign in with the email address that received this invite.");
      return;
    }

    setAccepting(true);
    try {
      const supabase = getSupabase();
      // Atomic accept via RPC: flips status, sets user_id, links project_team_members.
      const { error: rpcError } = await supabase.rpc("accept_org_invite", {
        _token: (invite as Invite & { inviteToken?: string }).inviteToken ?? token,
        _display_name: displayName,
        _github_login: githubLogin,
        _avatar_url: userMeta.avatar_url ?? null,
      });

      if (rpcError) {
        // Fallback for environments where the migration hasn't been applied yet.
        console.warn("accept_org_invite RPC failed, falling back:", rpcError);
        const { error } = await supabase
          .from("org_members")
          .update({
            status: "accepted",
            user_id: user.id,
            joined_at: new Date().toISOString(),
            display_name: displayName,
            github_login: githubLogin,
            avatar_url: userMeta.avatar_url ?? null,
          })
          .eq("id", invite.id);
        if (error) throw error;
      }

      // Trigger a global sync so projects/tasks/team queries refresh.
      try {
        const { emitSync } = await import("@/lib/sync");
        emitSync();
      } catch {
        /* ignore */
      }

      toast.success(`You joined ${invite.orgName}.`);
      // Land inside the org dashboard (projects list) instead of /notifications.
      navigate({ to: "/projects" });
    } catch (error) {
      console.error("Failed to accept invite:", error);
      toast.error("Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  }

  if (loadingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="glass rounded-3xl p-8 w-full max-w-lg">
          <div className="h-6 w-40 rounded bg-muted/60 animate-pulse" />
          <div className="mt-4 h-4 w-3/4 rounded bg-muted/60 animate-pulse" />
          <div className="mt-10 h-12 w-48 rounded-xl bg-muted/60 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <div className="glass rounded-3xl p-8 w-full max-w-lg text-center">
          <p className="text-sm text-muted-foreground">
            This invitation is invalid or has expired.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Back to DevANT</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isInviteEmail = Boolean(email) && email === invite.invitedEmail.toLowerCase();

  return (
    <div className="min-h-screen bg-background px-4 py-10 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(108,99,255,0.25),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.14),_transparent_30%)]" />
      <div className="w-full max-w-2xl glass rounded-[28px] p-6 sm:p-10 border-border/60 shadow-2xl">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="size-11 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <Mail className="size-5" />
          </div>
          <div>
            <div className="font-semibold text-foreground">Organization invitation</div>
            <div>Sent to {invite.invitedEmail}</div>
          </div>
        </div>

        <h1 className="mt-6 text-3xl sm:text-4xl font-display font-bold tracking-tight">
          You&apos;ve been invited to <span className="text-gradient">{invite.orgName}</span>
        </h1>
        <p className="mt-4 text-sm sm:text-base text-muted-foreground max-w-xl leading-7">
          Accept this invitation to join the organization, see its projects, and collaborate from
          DevANT.
        </p>

        <div className="mt-8 rounded-2xl border border-border/60 bg-background/70 p-5 sm:p-6 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <ShieldCheck className="size-4 text-primary" />
            <span>
              If this email address matches your GitHub login, you can accept immediately.
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <ArrowRight className="size-4" />
            <span>Use the same account that received the invitation email.</span>
          </div>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          {!user ? (
            <Button
              size="lg"
              className="gap-2"
              onClick={() => signInWithGitHub(window.location.href)}
            >
              <Github className="size-4" /> Sign in with GitHub to accept
            </Button>
          ) : (
            <Button
              size="lg"
              className="gap-2"
              onClick={acceptInvite}
              disabled={accepting || !isInviteEmail}
            >
              <ShieldCheck className="size-4" />
              {accepting ? "Accepting..." : "Accept invitation"}
            </Button>
          )}
          <Button asChild size="lg" variant="outline">
            <Link to="/notifications">View notifications</Link>
          </Button>
        </div>

        {user && !isInviteEmail && !loading && (
          <p className="mt-4 text-sm text-amber-500">
            Signed in as {user.email}. Switch to {invite.invitedEmail} before accepting.
          </p>
        )}
      </div>
    </div>
  );
}
