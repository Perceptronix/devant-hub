import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Check, AlertCircle } from "lucide-react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { getSupabase } from "@/integrations/supabase/client";
import { slugify } from "@/lib/create-org";

export interface OrgFormFields {
  orgName: string;
  slug: string;
  slugEdited: boolean;
  description: string;
  githubLogin: string;
}

export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function validateGitHubOrg(login: string, user: any): Promise<{ valid: boolean; name?: string; message?: string }> {
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

export interface OrganizationFormProps {
  fields: OrgFormFields;
  onChange: (updater: (prev: OrgFormFields) => OrgFormFields) => void;
  onValidationChange?: (isValid: boolean) => void;
  children?: React.ReactNode;
}

export function OrganizationForm({
  fields,
  onChange,
  onValidationChange,
  children,
}: OrganizationFormProps) {
  const { user } = useAuth();
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const [ghStatus, setGhStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle");
  const [ghOrgName, setGhOrgName] = useState<string>("");
  const [ghMessage, setGhMessage] = useState<string>("");

  // Auto-slugify
  useEffect(() => {
    if (!fields.slugEdited && fields.orgName) {
      const generated = slugify(fields.orgName);
      onChange((prev) => ({ ...prev, slug: generated }));
    }
  }, [fields.orgName, fields.slugEdited, onChange]);

  // Slug availability check
  useEffect(() => {
    if (!fields.slug.trim()) { setSlugStatus("idle"); return; }
    if (!SLUG_REGEX.test(fields.slug)) { setSlugStatus("invalid"); return; }
    let mounted = true;
    setSlugStatus("checking");
    const t = window.setTimeout(async () => {
      try {
        const { data } = await getSupabase().from("organizations").select("id").eq("slug", fields.slug).limit(1);
        if (mounted) {
          if (data?.length) {
            setSlugStatus("taken");
          } else {
            setSlugStatus("available");
          }
        }
      } catch {
        if (mounted) setSlugStatus("invalid");
      }
    }, 400);
    return () => { mounted = false; window.clearTimeout(t); };
  }, [fields.slug]);

  // GitHub Org validation check
  useEffect(() => {
    if (!fields.githubLogin.trim()) {
      setGhStatus("idle");
      setGhOrgName("");
      setGhMessage("");
      return;
    }
    let mounted = true;
    setGhStatus("checking");
    const t = window.setTimeout(async () => {
      const res = await validateGitHubOrg(fields.githubLogin, user);
      if (mounted) {
        if (res.valid) {
          setGhStatus("valid");
          setGhOrgName(res.name || fields.githubLogin);
          setGhMessage("");
        } else {
          setGhStatus("invalid");
          setGhOrgName("");
          setGhMessage(res.message || "Invalid GitHub organization.");
        }
      }
    }, 500);
    return () => { mounted = false; window.clearTimeout(t); };
  }, [fields.githubLogin, user]);

  const slugHint = useMemo(() => {
    if (slugStatus === "checking")  return "Checking availability…";
    if (slugStatus === "taken")     return "This slug is already taken.";
    if (slugStatus === "available") return "Slug is available.";
    if (slugStatus === "invalid")   return "Lowercase letters, numbers and hyphens only.";
    return "Auto-generated from your organization name.";
  }, [slugStatus]);

  const isValid = useMemo(() => {
    const nameValid = fields.orgName.trim().length >= 2 && fields.orgName.trim().length <= 50;
    const slugValid = slugStatus === "available";
    const ghValid = !fields.githubLogin.trim() || ghStatus === "valid";
    return nameValid && slugValid && ghValid;
  }, [fields.orgName, fields.githubLogin, slugStatus, ghStatus]);

  useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-foreground">Organization name</label>
          <Input
            value={fields.orgName}
            onChange={(e) => onChange((prev) => ({ ...prev, orgName: e.target.value }))}
            placeholder="Acme Labs"
            className="mt-2"
          />
          <p className="mt-1 text-xs text-muted-foreground">Required, 2–50 characters.</p>
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Slug</label>
          <Input
            value={fields.slug}
            onChange={(e) => onChange((prev) => ({ ...prev, slugEdited: true, slug: e.target.value }))}
            placeholder="acme-labs"
            className="mt-2"
          />
          <p className={`mt-1 text-xs ${slugStatus === "taken" || slugStatus === "invalid" ? "text-amber-400" : slugStatus === "available" ? "text-emerald-400 font-medium" : "text-muted-foreground"}`}>
            {slugHint}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            devant.app/org/<span className="text-foreground font-medium">{fields.slug || "your-slug"}</span>
          </p>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">
          Description <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Textarea
          value={fields.description}
          onChange={(e) => onChange((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="A place to ship faster with your team"
          className="mt-2"
        />
      </div>
      <div>
        <label className="text-sm font-medium text-foreground">
          GitHub org login <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <Input
          value={fields.githubLogin}
          onChange={(e) => onChange((prev) => ({ ...prev, githubLogin: e.target.value }))}
          placeholder="github-org-login"
          className="mt-2"
        />
        {ghStatus === "checking" && (
          <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin" /> Validating organization on GitHub…
          </p>
        )}
        {ghStatus === "valid" && (
          <p className="mt-1 text-xs text-emerald-400 font-medium flex items-center gap-1.5">
            <Check className="size-3.5" /> Found GitHub Org: {ghOrgName}
          </p>
        )}
        {ghStatus === "invalid" && (
          <p className="mt-1 text-xs text-rose-400 font-medium flex items-center gap-1.5">
            <AlertCircle className="size-3.5" /> {ghMessage}
          </p>
        )}
        {ghStatus === "idle" && (
          <p className="mt-1 text-xs text-muted-foreground">Validates against GitHub API to auto-link repos and members.</p>
        )}
      </div>
      {children}
    </div>
  );
}
