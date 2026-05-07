import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const supabase = getSupabase();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, user: session?.user ?? null, loading };
}

export async function signInWithGitHub() {
  const supabase = getSupabase();
  const redirectTo = `${window.location.origin}/`;
  return supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo,
      scopes: "repo read:org read:user user:email",
    },
  });
}

export async function signOut() {
  const supabase = getSupabase();
  await supabase.auth.signOut();
  window.location.href = "/login";
}

export function getGitHubToken(user: User | null): string | null {
  if (!user) return null;
  // Provider token stored in user_metadata after OAuth
  return (
    (user.user_metadata as Record<string, unknown>)?.provider_token as string | undefined ??
    (user.app_metadata as Record<string, unknown>)?.provider_token as string | undefined ??
    null
  );
}
