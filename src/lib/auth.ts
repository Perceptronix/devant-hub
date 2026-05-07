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
      // When OAuth flow completes Supabase emits provider_token on the session.
      // Persist it to localStorage so client code can use it for API calls.
      try {
        if (typeof window !== "undefined" && s && (s as unknown as Record<string, any>).provider_token) {
          window.localStorage.setItem("oauth_provider_token", (s as unknown as Record<string, any>).provider_token);
        }
      } catch (err) {
        // ignore
      }
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      // getSession may include provider_token immediately after redirect
      try {
        const ses = data.session as unknown as Record<string, any> | null;
        if (typeof window !== "undefined" && ses && ses.provider_token) {
          window.localStorage.setItem("oauth_provider_token", ses.provider_token);
        }
      } catch (err) {
        // ignore
      }
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
  // Supabase emits provider_token only on the session during OAuth redirect; we persist
  // it to localStorage in `useAuth`. Prefer that, then fall back to user metadata.
  try {
    if (typeof window !== "undefined") {
      const t = window.localStorage.getItem("oauth_provider_token");
      if (t) return t;
    }
  } catch (err) {
    // ignore
  }

  return (
    (user.user_metadata as Record<string, unknown>)?.provider_token as string | undefined ??
    (user.app_metadata as Record<string, unknown>)?.provider_token as string | undefined ??
    null
  );
}
