import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Check, Plus, ArrowRight, Users2, Github } from "lucide-react";
import { useAuth, signInWithGitHub } from "@/lib/auth";
import { getSupabase } from "@/integrations/supabase/client";
import { createOrgInvite } from "@/lib/org-invites";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Create your org — DevANT" }] }),
  component: Onboarding,
});

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function Onboarding() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [githubOrgLogin, setGithubOrgLogin] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [creating, setCreating] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<string[]>(["Backend", "Design", "Platform"]);
  const [newDepartment, setNewDepartment] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [pendingInvites, setPendingInvites] = useState<Array<{ id: string; invitedEmail: string }>>([]);
  const [isInviting, setIsInviting] = useState(false);

  useEffect(() => {
    const nextSlug = slugify(orgName || slug);
    if (!orgName.trim() && !slug.trim()) {
      setSlugStatus("idle");
      return;
    }

    const candidate = slug || nextSlug;
    setSlug(candidate);
    if (!candidate) {
      setSlugStatus("invalid");
      return;
    }
    if (!SLUG_REGEX.test(candidate)) {
      setSlugStatus("invalid");
      return;
    }

    let mounted = true;
    setSlugStatus("checking");
    const timer = window.setTimeout(async () => {
      try {
        const supabase = getSupabase();
        const { data } = await supabase.from("organizations").select("id").eq("slug", candidate).limit(1);
        if (!mounted) return;
        setSlugStatus(data?.length ? "taken" : "available");
      } catch (error) {
        if (!mounted) return;
        setSlugStatus("invalid");
      }
    }, 400);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [orgName, slug]);

  const slugHint = useMemo(() => {
    if (slugStatus === "checking") return "Checking slug availability…";
    if (slugStatus === "taken") return "This slug is already taken.";
    if (slugStatus === "available") return "Slug is available.";
    if (slugStatus === "invalid") return "Use lowercase letters, numbers and hyphens only.";
    return "Auto-generated from your organization name.";
  }, [slugStatus]);

  const canCreateOrg = orgName.trim().length >= 2 && orgName.trim().length <= 50 && slugStatus === "available";

  const handleCreateOrg = async () => {
    if (!user) {
      await signInWithGitHub(`${window.location.origin}/onboarding`);
      return;
    }
    if (!canCreateOrg) {
      toast.error("Please choose a valid organization name and slug.");
      return;
    }

    setCreating(true);
    try {
      const supabase = getSupabase();
      const { data: org, error } = await supabase
        .from("organizations")
        .insert({
          name: orgName.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          github_org_login: githubOrgLogin.trim() || null,
          owner_id: user.id,
        })
        .select("id, slug, name")
        .single();

      if (error || !org) {
        throw error ?? new Error("Failed to create organization.");
      }

      const { error: memberError } = await supabase.from("org_members").insert({
        org_id: org.id,
        user_id: user.id,
        role: "owner",
        status: "accepted",
        joined_at: new Date().toISOString(),
      });
      if (memberError) {
        throw memberError;
      }

      setOrgId(org.id);
      setStep(1);
      toast.success("Organization created. Add your team next.");
    } catch (error) {
      console.error("onboarding create org", error);
      toast.error("Unable to create organization. Try a different slug.");
    } finally {
      setCreating(false);
    }
  };

  const addDepartment = () => {
    const value = newDepartment.trim();
    if (!value || departments.includes(value)) return;
    setDepartments((current) => [...current, value]);
    setNewDepartment("");
  };

  const handleInviteMember = async () => {
    if (!user || !orgId) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Enter a valid email address.");
      return;
    }
    setIsInviting(true);
    try {
      const result = await createOrgInvite({
        data: {
          orgId,
          invitedEmail: email,
          inviterId: user.id,
          inviterName: (user.user_metadata as any)?.full_name || user.email || "DevANT",
          inviterEmail: (user.email || "").toLowerCase(),
          baseUrl: window.location.origin,
        },
      });
      setPendingInvites((current) => [
        ...current,
        { id: result.id, invitedEmail: result.invitedEmail },
      ]);
      setInviteEmail("");
      toast.success(`Invite sent to ${email}`);
    } catch (error) {
      console.error("Failed to send invite", error);
      toast.error("Failed to send invite.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleFinish = () => {
    navigate({ to: "/projects" });
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex flex-col gap-6 rounded-[32px] border border-white/10 bg-[#090a12]/95 p-8 shadow-[0_0_80px_rgba(108,99,255,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground uppercase tracking-[0.24em]">Onboarding</div>
              <h1 className="mt-4 text-3xl font-display font-bold tracking-tight">Create your organization and invite your team.</h1>
            </div>
            <Link to="/login" className="text-sm text-muted-foreground underline hover:text-foreground">Sign in</Link>
          </div>

          <div className="flex items-center gap-3 overflow-x-auto rounded-full border border-white/10 bg-[#0f1120]/95 px-3 py-2 text-sm text-muted-foreground">
            {[{ label: "Organization" }, { label: "Departments" }, { label: "Invites" }].map((item, index) => (
              <div key={item.label} className={`rounded-full px-4 py-2 ${index === step ? "bg-primary text-black" : "bg-surface"}`}>
                {item.label}
              </div>
            ))}
          </div>

          {step === 0 ? (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-foreground">Organization name</label>
                  <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Labs" className="mt-2" />
                  <p className="mt-2 text-xs text-muted-foreground">Required, 2–50 characters.</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Organization slug</label>
                  <Input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="acme-labs" className="mt-2" />
                  <p className={`mt-2 text-xs ${slugStatus === "taken" || slugStatus === "invalid" ? "text-amber-400" : "text-muted-foreground"}`}>{slugHint}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A place to ship faster with your team" className="mt-2" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">GitHub org login</label>
                <Input value={githubOrgLogin} onChange={(e) => setGithubOrgLogin(e.target.value)} placeholder="github-org-login" className="mt-2" />
                <p className="mt-2 text-xs text-muted-foreground">Optional. Connecting the GitHub org helps auto-link repos and members.</p>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Add departments to organize your work.</h2>
                <p className="text-sm text-muted-foreground mt-1">Departments are optional, but helpful for grouping projects and teams.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {departments.map((department) => (
                  <span key={department} className="rounded-full bg-surface px-4 py-2 text-sm">{department}</span>
                ))}
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input value={newDepartment} onChange={(e) => setNewDepartment(e.target.value)} placeholder="Add another department" />
                <Button onClick={addDepartment} className="flex-none gap-2"><Plus className="size-4" /> Add</Button>
              </div>
              <p className="text-xs text-muted-foreground">You can manage departments later in organization settings.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-semibold">Invite your first teammates</h2>
                <p className="text-sm text-muted-foreground mt-1">Send invitations by email so your team can join the org immediately.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="team.member@example.com" />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                  className="rounded-xl border border-border bg-background px-3 py-3 text-sm text-foreground"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleInviteMember} disabled={isInviting || !inviteEmail.trim()} className="gap-2">
                  <Github className="size-4" /> Send invite
                </Button>
                <Button variant="outline" onClick={() => setInviteEmail("")}>Clear</Button>
              </div>
              {pendingInvites.length > 0 && (
                <div className="rounded-3xl border border-border p-4">
                  <div className="text-sm font-semibold mb-3">Pending invites</div>
                  <div className="flex flex-wrap gap-2">
                    {pendingInvites.map((invite) => (
                      <span key={invite.id} className="rounded-full bg-surface px-4 py-2 text-sm">{invite.invitedEmail}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-white/10 pt-6 sm:flex-row sm:justify-between sm:items-center">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            {step === 0 ? (
              <Button onClick={handleCreateOrg} disabled={creating || !canCreateOrg} className="gap-2">
                {creating ? "Creating org…" : "Create organization"}
              </Button>
            ) : step === 1 ? (
              <Button onClick={() => setStep(2)} className="gap-2">
                Continue to invites <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={handleFinish} className="gap-2">
                Finish setup <ArrowRight className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
