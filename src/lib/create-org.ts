/**
 * Single org-creation path used by onboarding and settings.
 * Inserts organizations row + owner org_members row atomically (best-effort).
 */
import { getSupabase } from "@/integrations/supabase/client";

export function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export interface CreateOrgInput {
  name: string;
  slug: string;
  description?: string;
  githubOrgLogin?: string;
  ownerId: string;
}

export interface CreatedOrg {
  id: string;
  name: string;
  slug: string;
}

export async function insertOrganization(input: CreateOrgInput): Promise<CreatedOrg> {
  const supabase = getSupabase();

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      name: input.name.trim(),
      slug: input.slug.trim(),
      description: input.description?.trim() || null,
      github_org_login: input.githubOrgLogin?.trim() || null,
      owner_id: input.ownerId,
    })
    .select("id, slug, name")
    .single();

  if (error || !org) throw error ?? new Error("Failed to create organization.");

  const { error: memberError } = await supabase.from("org_members").insert({
    org_id: org.id,
    user_id: input.ownerId,
    role: "owner",
    status: "accepted",
    joined_at: new Date().toISOString(),
  });

  if (memberError) throw memberError;

  return org as CreatedOrg;
}
