import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, ArrowRight, Github } from "lucide-react";
import { useAuth, signInWithGitHub } from "@/lib/auth";
import { getSupabase } from "@/integrations/supabase/client";
import { createOrgInvite } from "@/lib/org-invites";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SS_STEP = "onboarding_step";
const SS_ORG  = "onboarding_orgId";

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

function clearSession() {
  sessionStorage.removeItem(SS_STEP);
  sessionStorage.removeItem(SS_ORG);
}

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Restore step/orgId from sessionStorage so nav away + back doesn't reset progress
  const [step, setStepRaw] = useState(() => Number(sessionStorage.getItem(SS_STEP) ?? 0));
  const [orgId, setOrgIdRaw] = useState<string | null>(() => sessionStorage.getItem(SS_ORG));

  const setStep = (n: number) => { sessionStorage.setItem(SS_STEP, String(n)); setStepRaw(n); };
  const setOrgId = (id: string) => { sessionStorage.setItem(SS_ORG, id); setOrgIdRaw(id); };

  const [orgName, setOrgName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [githubOrgLogin, setGithubOrgLogin] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [creating, setCreating] = useState(false);
  const [departments, setDepartments] = useState<string[]>(["Backend", "Design", "Platform"]);
  const [newDepartment, setNewDepartment] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [pendingInvites, setPendingInvites] = useState<Array<{ id: string; invitedEmail: string }>>([]);
  const [isInviting, setIsInviting] = useState(false);

  // Auto-fill slug from org name (only when user hasn't manually edited slug)
  const [slugEdited, setSlugEdited] = useState(false);
  useEffect(() => {
    if (!slugEdited && orgName) setSlug(slugify(orgName));
  }, [orgName, slugEdited]);

  // Debounced slug availability check
  useEffect(() => {
    if (!slug.trim()) { setSlugStatus("idle"); return; }
    if (!SLUG_REGEX.test(slug)) { setSlugStatus("invalid"); return; }
    let mounted = true;
    setSlugStatus("checking");
    const timer = window.setTimeout(async () => {
      try {
        const { data } = await getSupabase().from("organizations").select("id").eq("slug", slug).limit(1);
        if (mounted) setSlugStatus(data?.length ? "taken" : "available");
      } catch {
        if (mounted) setSlugStatus("invalid");
      }
    }, 400);
    return () => { mounted = false; window.clearTimeout(timer); };
  }, [slug]);

  const slugHint = useMemo(() => {
    if (slugStatus === "checking")  return "Checking availability…";
    if (slugStatus === "taken")     return "This slug is already taken.";
    if (slugStatus === "available") return "Slug is available.";
    if (slugStatus === "invalid")   return "Lowercase letters, numbers and hyphens only.";
    return "Auto-generated from your organization name.";
  }, [slugStatus]);

  const canCreateOrg = orgName.trim().length >= 2 && orgName.trim().length <= 50 && slugStatus === "available";

  const handleCreateOrg = async () => {
    if (!user) {
      await signInWithGitHub(`${window.location.origin}/onboarding`);
      return;
    }
    if (!canCreateOrg) { toast.error("Please choose a valid organization name and slug."); return; }
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
      if (error || !org) throw error ?? new Error("Failed to create organization.");

      const { error: memberError } = await supabase.from("org_members").insert({
        org_id: org.id,
        user_id: user.id,
        role: "owner",
        status: "accepted",
        joined_at: new Date().toISOString(),
      });
      if (memberError) throw memberError;

      setOrgId(org.id);
      setStep(1);
      toast.success("Organization created. Add your team next.");
    } catch (err) {
      console.error("onboarding create org", err);
      toast.error("Unable to create organization. Try a different slug.");
    } finally {
      setCreating(false);
    }
  };

  const addDepartment = () => {
    const value = newDepartment.trim();
    if (!value || departments.includes(value)) return;
    setDepartments((cur) => [...cur, value]);
    setNewDepartment("");
  };

  const handleInviteMember = async () => {
    if (!user || !orgId) return;
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) { toast.error("Enter a valid email address."); return; }
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
      setPendingInvites((cur) => [...cur, { id: result.id, invitedEmail: result.invitedEmail }]);
      setInviteEmail("");
      toast.success(`Invite sent to ${email}`);
    } catch (err) {
      console.error("Failed to send invite", err);
      toast.error("Failed to send invite.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleFinish = () => {
    clearSession();
    navigate({ to: "/projects" });
  };

  const goToDashboard = () => {
    clearSession();
    navigate({ to: "/" });
  };

  const STEPS = ["Organization", "Departments", "Invites"];

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex flex-col gap-6 rounded-xl border border-border bg-surface p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Onboarding</p>
              <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">Create your organization and invite your team.</h1>
            </div>
            {/* ponytail: conditional render at the data level — no layout split needed because __root.tsx already isolates /onboarding from AppShell */}
            {!user && <Link to="/login" className="text-sm text-muted-foreground underline hover:text-foreground">Sign in</Link>}
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 text-sm">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <span className={`rounded-md px-3 py-1 text-xs font-medium ${i === step ? "bg-foreground text-background" : i < step ? "bg-surface-elevated text-foreground" : "bg-surface-elevated text-muted-foreground"}`}>
                  {label}
                </span>
                {i < STEPS.length - 1 && <span className="text-border">›</span>}
              </div>
            ))}
          </div>

          {/* Step content */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">Organization name</label>
                  <Input value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Labs" className="mt-2" />
                  <p className="mt-1 text-xs text-muted-foreground">Required, 2–50 characters.</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Slug</label>
                  <Input
                    value={slug}
                    onChange={(e) => { setSlugEdited(true); setSlug(e.target.value); }}
                    placeholder="acme-labs"
                    className="mt-2"
                  />
                  <p className={`mt-1 text-xs ${slugStatus === "taken" || slugStatus === "invalid" ? "text-amber-400" : "text-muted-foreground"}`}>{slugHint}</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="A place to ship faster with your team" className="mt-2" />
              </div>
              <div>
                <label className="text-sm font-medium">GitHub org login</label>
                <Input value={githubOrgLogin} onChange={(e) => setGithubOrgLogin(e.target.value)} placeholder="github-org-login" className="mt-2" />
                <p className="mt-1 text-xs text-muted-foreground">Optional. Helps auto-link repos and members.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Add departments</h2>
                <p className="mt-1 text-sm text-muted-foreground">Optional. Helpful for grouping projects and teams.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {departments.map((d) => (
                  <span key={d} className="rounded-md border border-border bg-surface-elevated px-3 py-1 text-sm">{d}</span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newDepartment}
                  onChange={(e) => setNewDepartment(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addDepartment()}
                  placeholder="Add a department"
                />
                <Button onClick={addDepartment} variant="outline" className="gap-1.5 shrink-0"><Plus className="size-4" /> Add</Button>
              </div>
              <p className="text-xs text-muted-foreground">You can manage departments later in settings.</p>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold">Invite teammates</h2>
                <p className="mt-1 text-sm text-muted-foreground">Send invitations so your team can join immediately.</p>
              </div>
              <div className="flex gap-2">
                <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleInviteMember()} placeholder="team.member@example.com" />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "member" | "admin")}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleInviteMember} disabled={isInviting || !inviteEmail.trim()} className="gap-2">
                  <Github className="size-4" />{isInviting ? "Sending…" : "Send invite"}
                </Button>
                <Button variant="outline" onClick={() => setInviteEmail("")} disabled={!inviteEmail}>Clear</Button>
              </div>
              {pendingInvites.length > 0 && (
                <div className="rounded-md border border-border p-4">
                  <p className="mb-2 text-sm font-medium">Pending invites</p>
                  <div className="flex flex-wrap gap-2">
                    {pendingInvites.map((inv) => (
                      <span key={inv.id} className="rounded-md border border-border bg-surface-elevated px-3 py-1 text-sm">{inv.invitedEmail}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation footer */}
          <div className="flex items-center justify-between border-t border-border pt-5">
            <Button variant="ghost" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              Back
            </Button>
            <div className="flex items-center gap-3">
              {step < 2 && (
                <Button variant="link" onClick={goToDashboard} className="h-auto p-0 text-sm text-muted-foreground">
                  Skip
                </Button>
              )}
              {step === 0 && (
                <Button onClick={handleCreateOrg} disabled={creating || !canCreateOrg}>
                  {creating ? "Creating…" : "Create organization"}
                </Button>
              )}
              {step === 1 && (
                <Button onClick={() => setStep(2)} className="gap-2">
                  Continue <ArrowRight className="size-4" />
                </Button>
              )}
              {step === 2 && (
                <Button onClick={handleFinish} className="gap-2">
                  Finish setup <ArrowRight className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
