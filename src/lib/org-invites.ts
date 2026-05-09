import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const InviteInput = z.object({
  orgId: z.string().uuid(),
  invitedEmail: z.string().email(),
  inviterId: z.string().uuid(),
  inviterName: z.string().min(1).max(200),
  inviterEmail: z.string().email(),
  baseUrl: z.string().url(),
});

const InviteLookupInput = z.object({
  token: z.string().min(12),
});

function getAdminSupabase() {
  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE ?? process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      [
        "Supabase admin env missing for invite email delivery.",
        `SUPABASE_URL=${supabaseUrl ? "set" : "missing"}`,
        `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey ? "set" : "missing"}`,
        "Also accepted: VITE_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE, SUPABASE_SECRET_KEY.",
      ].join(" "),
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const createOrgInvite = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InviteInput.parse(data))
  .handler(async ({ data }) => {
    console.log("[createOrgInvite] Handler invoked on server");
    const supabase = getAdminSupabase();
    const token = crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", data.orgId)
      .single();

    if (orgError) {
      throw orgError;
    }

    const { data: invite, error: insertError } = await supabase
      .from("org_members")
      .insert({
        org_id: data.orgId,
        user_id: null,
        invited_email: data.invitedEmail.toLowerCase(),
        invite_token: token,
        role: "member",
        status: "pending",
        invited_by: data.inviterId,
        invited_at: new Date().toISOString(),
      })
      .select("id, org_id, invited_email, invite_token")
      .single();

    if (insertError) {
      if ((insertError as { code?: string }).code === "23505") {
        throw new Error("This email is already invited or already a member.");
      }
      throw insertError;
    }

    return {
      id: invite.id,
      orgName: org.name,
      inviteToken: invite.invite_token,
      invitedEmail: invite.invited_email,
    };
  });

export const getOrgInviteByToken = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InviteLookupInput.parse(data))
  .handler(async ({ data }) => {
    const supabase = getAdminSupabase();

    const { data: invite, error } = await supabase
      .from("org_members")
      .select("id, org_id, invited_email, invited_at, status, invite_token, organizations(name)")
      .eq("invite_token", data.token)
      .single();

    if (error) {
      throw error;
    }

    return {
      id: invite.id,
      orgId: invite.org_id,
      orgName:
        (invite as { organizations?: { name?: string } }).organizations?.name ?? "Organization",
      invitedEmail: invite.invited_email,
      invitedAt: invite.invited_at,
      status: invite.status,
      inviteToken: invite.invite_token,
    };
  });

export const inviteEnvDebug = createServerFn({ method: "POST" }).handler(async () => {
  const keys = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "EMAILJS_USER_ID",
    "EMAILJS_SERVICE_ID",
    "EMAILJS_TEMPLATE_ID",
  ];
  const result: Record<string, boolean> = {};
  for (const k of keys) {
    result[k] = Boolean(process.env[k as keyof typeof process.env]);
  }
  console.log("[inviteEnvDebug] env presence:", result);
  return result;
});
