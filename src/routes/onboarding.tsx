import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, ArrowRight, ArrowLeft, X, Loader2, Check, AlertCircle, Building2, Mail, ChevronRight } from "lucide-react";
import { useAuth, signInWithGitHub, getGitHubToken } from "@/lib/auth";
import { getSupabase } from "@/integrations/supabase/client";
import { insertOrganization } from "@/lib/create-org";
import { createOrgInvite } from "@/lib/org-invites";
import { setStoredOrgId } from "@/lib/current-org";
import { Logo } from "@/components/Logo";
import { Rise } from "cube-motion/react";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SS_STEP = "onboarding_step";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Create your org — DevANT" }] }),
  component: Onboarding,
});

function slugify(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

async function validateGitHubOrg(login: string, user: any): Promise<{ valid: boolean; name?: string; message?: string }> {
  const trimmed = login.trim();
  if (!trimmed) return { valid: true };
  try {
    const token = getGitHubToken(user);
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const res = await fetch(`https://api.github.com/orgs/${encodeURIComponent(trimmed)}`, { headers });
    if (res.status === 200) {
      const data = await res.json();
      return { valid: true, name: data.name || data.login };
    } else if (res.status === 404) {
      return { valid: false, message: "GitHub organization not found on GitHub." };
    } else {
      return { valid: false, message: `GitHub API status ${res.status}.` };
    }
  } catch (err: any) {
    return { valid: false, message: err?.message || "Failed to validate GitHub org." };
  }
}

import { OrganizationForm, OrgFormFields } from "@/components/OrganizationForm";

// ─── Step 0 — Organization ────────────────────────────────────────────────────

function OrgStep({
  form,
  onChange,
  onNext,
}: {
  form: OrgFormFields;
  onChange: (updater: (prev: OrgFormFields) => OrgFormFields) => void;
  onNext: () => void;
}) {
  const { user } = useAuth();
  const [isValid, setIsValid] = useState(false);

  const handleNextClick = async () => {
    if (!user) {
      await signInWithGitHub(`${window.location.origin}/onboarding`);
      return;
    }
    if (!isValid) {
      toast.error("Please provide a valid organization name, available slug, and valid GitHub org.");
      return;
    }
    onNext();
  };

  return (
    <Rise key="org">
      <OrganizationForm fields={form} onChange={onChange} onValidationChange={setIsValid}>
        <div className="pt-2 flex justify-end">
          <Button onClick={handleNextClick} disabled={!isValid} className="gap-2 cursor-pointer">
            Continue to Departments <ArrowRight className="size-4" />
          </Button>
        </div>
      </OrganizationForm>
    </Rise>
  );
}

// ─── Step 1 — Departments ─────────────────────────────────────────────────────

function DepartmentsStep({
  departments,
  input,
  onDepartmentsChange,
  onInputChange,
  onNext,
  onSkip,
}: {
  departments: string[];
  input: string;
  onDepartmentsChange: (updater: (prev: string[]) => string[]) => void;
  onInputChange: (val: string) => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const add = () => {
    const v = input.trim();
    if (!v || departments.includes(v)) return;
    onDepartmentsChange((d) => [...d, v]);
    onInputChange("");
  };

  const remove = (name: string) => onDepartmentsChange((d) => d.filter((x) => x !== name));

  return (
    <Rise key="depts">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Add departments <span className="text-sm font-normal text-muted-foreground">(optional)</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Group projects and teams by department. You can manage these later in Settings.</p>
        </div>
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder="e.g. Engineering, Product, Design"
            className="flex-1"
          />
          <Button onClick={add} variant="outline" className="gap-1.5 shrink-0 cursor-pointer" disabled={!input.trim()}>
            <Plus className="size-4" /> Add department
          </Button>
        </div>
        {departments.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {departments.map((d) => (
              <span key={d} className="flex items-center gap-1.5 rounded-md border border-border bg-surface-elevated px-3 py-1.5 text-sm font-medium text-foreground">
                <Building2 className="size-3.5 text-primary" />
                {d}
                <button onClick={() => remove(d)} className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer ml-1" aria-label={`Remove ${d}`}>
                  <X className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="pt-2 flex items-center justify-between">
          <Button variant="ghost" onClick={onSkip} className="text-muted-foreground cursor-pointer">
            Skip departments
          </Button>
          <Button onClick={onNext} className="gap-2 cursor-pointer">
            Continue to Invites <ArrowRight className="size-4" />
          </Button>
        </div>
      </div>
    </Rise>
  );
}

// ─── Step 2 — Invites & Commit ────────────────────────────────────────────────

interface PendingInvite {
  email: string;
  role: "member" | "admin";
  department?: string;
}

function InvitesStep({
  departments,
  invites,
  email,
  role,
  department,
  onInvitesChange,
  onEmailChange,
  onRoleChange,
  onDeptChange,
  onSubmitAll,
  onSkipAndSubmit,
  committing,
}: {
  departments: string[];
  invites: PendingInvite[];
  email: string;
  role: "member" | "admin";
  department: string;
  onInvitesChange: (updater: (prev: PendingInvite[]) => PendingInvite[]) => void;
  onEmailChange: (val: string) => void;
  onRoleChange: (val: "member" | "admin") => void;
  onDeptChange: (val: string) => void;
  onSubmitAll: () => void;
  onSkipAndSubmit: () => void;
  committing: boolean;
}) {
  const addInvite = () => {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (invites.some((inv) => inv.email === e)) {
      toast.error("This email is already added to the invite list.");
      return;
    }
    onInvitesChange((prev) => [...prev, { email: e, role, department: department || undefined }]);
    onEmailChange("");
  };

  const removeInvite = (targetEmail: string) => {
    onInvitesChange((prev) => prev.filter((i) => i.email !== targetEmail));
  };

  return (
    <Rise key="invites">
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Invite teammates <span className="text-sm font-normal text-muted-foreground">(optional)</span>
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Invite team members to join your organization. Assign roles and optional departments.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-12">
          <Input
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addInvite();
              }
            }}
            placeholder="colleague@example.com"
            type="email"
            className="sm:col-span-5"
          />
          <select
            value={role}
            onChange={(e) => onRoleChange(e.target.value as "member" | "admin")}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none sm:col-span-3"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
          <select
            value={department}
            onChange={(e) => onDeptChange(e.target.value)}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none sm:col-span-4"
          >
            <option value="">No department</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end">
          <Button onClick={addInvite} variant="outline" disabled={!email.trim()} className="gap-1.5 shrink-0 cursor-pointer">
            <Plus className="size-4" /> Add invite to list
          </Button>
        </div>

        {invites.length > 0 && (
          <div className="rounded-xl border border-border p-4 space-y-2 bg-surface-elevated/40">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Pending invites to send ({invites.length})</p>
            <div className="space-y-2">
              {invites.map((inv) => (
                <div key={inv.email} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
                  <div className="flex items-center gap-2 truncate">
                    <Mail className="size-4 text-primary shrink-0" />
                    <span className="font-medium text-foreground truncate">{inv.email}</span>
                    <span className="rounded-full bg-surface-elevated border border-border px-2 py-0.5 text-xs text-muted-foreground capitalize">
                      {inv.role}
                    </span>
                    {inv.department && (
                      <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-xs font-medium">
                        {inv.department}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => removeInvite(inv.email)}
                    className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer shrink-0"
                    aria-label={`Remove ${inv.email}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 flex items-center justify-between border-t border-border">
          <Button variant="ghost" onClick={onSkipAndSubmit} disabled={committing} className="text-muted-foreground cursor-pointer">
            Skip invites & create org
          </Button>
          <Button onClick={onSubmitAll} disabled={committing} className="gap-2 cursor-pointer bg-primary text-primary-foreground">
            {committing ? (
              <><Loader2 className="size-4 animate-spin" /> Creating organization…</>
            ) : (
              <>Create organization <ArrowRight className="size-4" /></>
            )}
          </Button>
        </div>
      </div>
    </Rise>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

const STEP_LABELS = ["Organization", "Departments", "Invites"];

function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStepRaw] = useState(() => {
    const s = Number(sessionStorage.getItem(SS_STEP) ?? 0);
    return isNaN(s) ? 0 : s;
  });

  // Step 0 Form State
  const [orgForm, setOrgForm] = useState<OrgFormFields>({
    orgName: "",
    slug: "",
    slugEdited: false,
    description: "",
    githubLogin: "",
  });
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [ghStatus, setGhStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [ghOrgName, setGhOrgName] = useState<string>("");

  // Step 1 Departments Form State
  const [departments, setDepartments] = useState<string[]>([]);
  const [deptInput, setDeptInput] = useState("");

  // Step 2 Invites Form State
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviteDept, setInviteDept] = useState("");

  const [committing, setCommitting] = useState(false);

  const setStep = (n: number) => {
    sessionStorage.setItem(SS_STEP, String(n));
    setStepRaw(n);
  };

  const clearSession = () => {
    sessionStorage.removeItem(SS_STEP);
  };

  const isOrgStepValid = useMemo(() => {
    const nameValid = orgForm.orgName.trim().length >= 2 && orgForm.orgName.trim().length <= 50;
    const slugValid = slugStatus === "available";
    const ghValid = !orgForm.githubLogin.trim() || ghStatus === "valid";
    return nameValid && slugValid && ghValid;
  }, [orgForm.orgName, orgForm.githubLogin, slugStatus, ghStatus]);

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      clearSession();
      navigate({ to: "/" });
    }
  };

  // ─── Final Commit Action ──────────────────────────────────────────────────
  const handleCommitAll = async (skipInvites = false) => {
    if (!user) {
      await signInWithGitHub(`${window.location.origin}/onboarding`);
      return;
    }
    if (!isOrgStepValid) {
      toast.error("Please ensure Organization details are complete and valid.");
      setStep(0);
      return;
    }

    setCommitting(true);
    try {
      // 1. Create Organization in Supabase
      const org = await insertOrganization({
        name: orgForm.orgName.trim(),
        slug: orgForm.slug.trim(),
        description: orgForm.description.trim(),
        githubOrgLogin: orgForm.githubLogin.trim(),
        ownerId: user.id,
      });

      // 2. Insert Departments in Supabase (if any)
      if (departments.length > 0) {
        const supabase = getSupabase();
        const deptRows = departments.map((name) => ({
          org_id: org.id,
          name,
        }));
        const { error: deptErr } = await supabase.from("departments").insert(deptRows);
        if (deptErr) {
          console.error("Failed to insert departments:", deptErr);
          toast.error(`Organization created, but saving departments failed: ${deptErr.message}`);
        }
      }

      // 3. Fire Invites (if any)
      const invitesToSend = skipInvites ? [] : invites;
      if (invitesToSend.length > 0) {
        let sentCount = 0;
        let errCount = 0;
        for (const inv of invitesToSend) {
          try {
            await createOrgInvite({
              data: {
                orgId: org.id,
                invitedEmail: inv.email,
                inviterId: user.id,
                inviterName: (user.user_metadata as any)?.full_name || user.email || "DevANT",
                inviterEmail: (user.email || "").toLowerCase(),
                baseUrl: window.location.origin,
                role: inv.role,
              },
            });
            sentCount++;
          } catch (err: any) {
            console.error(`Failed to invite ${inv.email}:`, err);
            errCount++;
          }
        }
        if (errCount > 0) {
          toast.warning(`Org created. Sent ${sentCount} invite(s), ${errCount} failed.`);
        } else {
          toast.success(`Organization created & ${sentCount} invite(s) sent!`);
        }
      } else {
        toast.success("Organization created successfully!");
      }

      // 4. Activate new org & redirect
      setStoredOrgId(org.id);
      clearSession();
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      console.error("Failed creating organization:", err);
      toast.error(err?.message ?? "Failed to create organization. Please try again.");
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-2xl">
        {/* Onboarding Shell Card */}
        <div className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-8 shadow-lg">
          {/* Top Bar Navigation (Logo & Sign in) */}
          <div className="flex items-center justify-between border-b border-border pb-5">
            <Link to="/" onClick={clearSession} className="flex items-center gap-2 hover:opacity-85 transition-opacity">
              <Logo />
            </Link>
            {!user && (
              <Link to="/login" className="text-sm text-muted-foreground underline hover:text-foreground">
                Sign in
              </Link>
            )}
          </div>

          {/* Header Description */}
          <div>
            <p className="text-xs uppercase tracking-widest text-primary font-semibold">Organization Onboarding</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
              Create your organization and invite your team.
            </h1>
          </div>

          {/* Step indicator pills */}
          <div className="flex items-center gap-2 text-sm">
            {STEP_LABELS.map((label, i) => {
              const isCurrent = i === step;
              const isAllowed = i === 0 || isOrgStepValid;
              return (
                <div key={label} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => isAllowed && setStep(i)}
                    disabled={!isAllowed}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isCurrent
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : isAllowed
                        ? "bg-surface-elevated text-foreground hover:bg-surface-elevated/80 cursor-pointer"
                        : "bg-surface-elevated/40 text-muted-foreground cursor-not-allowed opacity-60"
                    }`}
                  >
                    {i < step && <Check className="size-3 shrink-0 text-emerald-400" />}
                    {label}
                  </button>
                  {i < STEP_LABELS.length - 1 && <ChevronRight className="size-3.5 text-muted-foreground/40 shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Step Content */}
          {step === 0 && (
            <OrgStep
              form={orgForm}
              onChange={setOrgForm}
              onNext={() => setStep(1)}
            />
          )}
          {step === 1 && (
            <DepartmentsStep
              departments={departments}
              input={deptInput}
              onDepartmentsChange={setDepartments}
              onInputChange={setDeptInput}
              onNext={() => setStep(2)}
              onSkip={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <InvitesStep
              departments={departments}
              invites={invites}
              email={inviteEmail}
              role={inviteRole}
              department={inviteDept}
              onInvitesChange={setInvites}
              onEmailChange={setInviteEmail}
              onRoleChange={setInviteRole}
              onDeptChange={setInviteDept}
              onSubmitAll={() => handleCommitAll(false)}
              onSkipAndSubmit={() => handleCommitAll(true)}
              committing={committing}
            />
          )}

          {/* Bottom Card Footer: Step-to-step Back (Steps 1+) & Standardized Back to Home Link */}
          <div className="border-t border-border pt-4 -mt-2 space-y-3">
            {step > 0 && (
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  disabled={committing}
                  className="gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ArrowLeft className="size-4" />
                  Back to {STEP_LABELS[step - 1]}
                </Button>
              </div>
            )}
            <div className="flex justify-start">
              <Link
                to="/"
                onClick={clearSession}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="size-3.5" /> Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
