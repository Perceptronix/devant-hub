import { getSupabase } from "@/integrations/supabase/client";

export interface ImportedProject {
  id: string;
  owner: string;
  repo: string;
  name: string;
  description?: string;
  defaultBranch?: string;
  private?: boolean;
  github_repo_id?: number;
  org_id?: string;
}

function selectedKey(userId: string) {
  return `devant.selectedProject.${userId}`;
}

// Fetch imported projects for a user from Supabase `projects` table.
export async function fetchImportedProjects(userId: string): Promise<ImportedProject[]> {
  if (typeof window === "undefined") return [];
  if (!userId) return [];
  try {
    const supabase = getSupabase();
    const [{ data, error }, { data: orgs, error: orgError }] = await Promise.all([
      supabase
      .from("projects")
      .select(
        "id, name, description, github_repo_owner, github_repo_name, default_branch, is_private, github_repo_id, org_id"
      )
      .eq("created_by", userId)
      .order("created_at", { ascending: false });
      supabase
        .from("organizations")
        .select("id, github_org_login")
    ]);
    if (error || orgError) {
      console.error("fetchImportedProjects", error);
      if (orgError) console.error("fetchImportedProjects orgs", orgError);
      return [];
    }
    const orgIdByLogin = new Map((orgs ?? []).map((org: any) => [String(org.github_org_login ?? "").toLowerCase(), org.id] as const));
    return (data ?? []).map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      owner: r.github_repo_owner,
      repo: r.github_repo_name,
      defaultBranch: r.default_branch,
      private: r.is_private,
      github_repo_id: r.github_repo_id,
      org_id: r.org_id ?? orgIdByLogin.get(String(r.github_repo_owner ?? "").toLowerCase()),
    }));
  } catch (err) {
    console.error("fetchImportedProjects err", err);
    return [];
  }
}

// Insert a project into Supabase and return the inserted row as ImportedProject (or null).
export async function insertImportedProject(userId: string, project: ImportedProject): Promise<ImportedProject | null> {
  if (typeof window === "undefined") return null;
  try {
    const supabase = getSupabase();
    const insert = {
      name: project.name,
      description: project.description ?? null,
      github_repo_owner: project.owner,
      github_repo_name: project.repo,
      github_repo_id: project.github_repo_id ?? null,
      default_branch: project.defaultBranch ?? "main",
      is_private: project.private ?? false,
      org_id: project.org_id ?? null,
      created_by: userId,
    };
    const { data, error } = await supabase.from("projects").insert(insert).select().single();
    if (error) {
      console.error("insertImportedProject", error);
      return null;
    }
    const r: any = data;
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      owner: r.github_repo_owner,
      repo: r.github_repo_name,
      defaultBranch: r.default_branch,
      private: r.is_private,
      github_repo_id: r.github_repo_id,
      org_id: r.org_id,
    };
  } catch (err) {
    console.error("insertImportedProject err", err);
    return null;
  }
}

export async function removeImportedProject(userId: string, projectId: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!userId || !projectId) return false;
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .eq("created_by", userId);
    if (error) {
      console.error("removeImportedProject", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("removeImportedProject err", err);
    return false;
  }
}

export function getSelectedImportedProject(userId: string): ImportedProject | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(selectedKey(userId));
    if (!raw) return null;
    return JSON.parse(raw) as ImportedProject;
  } catch {
    return null;
  }
}

export function setSelectedImportedProject(userId: string, project: ImportedProject) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(selectedKey(userId), JSON.stringify(project));
}
