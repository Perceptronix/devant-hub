import { useEffect, useState, useCallback } from "react";
import { getSupabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export interface Org {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  github_org_login?: string | null;
}

const STORAGE_KEY = "devant.currentOrgId";
const CHANGE_EVENT = "devant:current-org-changed";

export function getStoredOrgId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredOrgId(id: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // ignore
  }
}

export function useCurrentOrg() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Org | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!user) {
      setOrgs([]);
      setCurrentOrg(null);
      return;
    }
    setLoading(true);
    try {
      const supabase = getSupabase();
      const [{ data: owned }, { data: memberRows }] = await Promise.all([
        supabase
          .from("organizations")
          .select("id, name, slug, owner_id, github_org_login")
          .eq("owner_id", user.id),
        supabase
          .from("org_members")
          .select("org_id")
          .eq("user_id", user.id)
          .eq("status", "accepted"),
      ]);
      const memberIds = new Set((memberRows ?? []).map((r: any) => r.org_id));
      let memberOrgs: Org[] = [];
      if (memberIds.size > 0) {
        const { data } = await supabase
          .from("organizations")
          .select("id, name, slug, owner_id, github_org_login")
          .in("id", Array.from(memberIds));
        memberOrgs = (data ?? []) as Org[];
      }
      const all = [...(owned ?? []), ...memberOrgs].reduce<Org[]>((acc, o) => {
        if (!acc.find((x) => x.id === o.id)) acc.push(o as Org);
        return acc;
      }, []);
      setOrgs(all);
      const storedId = getStoredOrgId();
      const next = all.find((o) => o.id === storedId) ?? all[0] ?? null;
      setCurrentOrg(next);
      if (next && next.id !== storedId) setStoredOrgId(next.id);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    function onChange() {
      const id = getStoredOrgId();
      setCurrentOrg((prev) => {
        const found = orgs.find((o) => o.id === id) ?? null;
        return found ?? prev;
      });
    }
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, [orgs]);

  const switchOrg = useCallback((id: string) => {
    setStoredOrgId(id);
  }, []);

  return { orgs, currentOrg, loading, switchOrg, reload };
}
