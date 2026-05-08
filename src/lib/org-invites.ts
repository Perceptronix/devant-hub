import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const InviteInput = z.object({
  orgId: z.string().uuid(),
  invitedEmail: z.string().email(),
  inviterId: z.string().uuid(),
  inviterName: z.string().min(1).max(200),
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

function getInviteFromAddress() {
  return (
    process.env.DEVANT_INVITE_FROM_EMAIL ??
    process.env.RESEND_FROM_EMAIL ??
    "DevANT <onboarding@resend.dev>"
  );
}

function buildInviteEmail(orgName: string, inviterName: string, inviteUrl: string) {
  const subject = `${inviterName} invited you to ${orgName}`;
  const html = `
    <div style="margin:0;padding:0;background:#0f1117;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb">
      <div style="max-width:640px;margin:0 auto;padding:40px 20px">
        <div style="padding:28px;border:1px solid #232636;border-radius:18px;background:#161922;box-shadow:0 24px 80px rgba(0,0,0,.35)">
          <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#8b93a7;margin-bottom:14px">DevANT</div>
          <h1 style="margin:0 0 12px;font-size:28px;line-height:1.2;color:#f8fafc">Invitation to collaborate</h1>
          <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#cbd5e1">${inviterName} invited you to join <strong>${orgName}</strong> on DevANT.</p>
          <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#94a3b8">Accept the invitation to access the organization, see its projects, and start collaborating from the dashboard.</p>
          <a href="${inviteUrl}" style="display:inline-block;background:#6c63ff;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:12px">Accept invitation</a>
          <div style="margin-top:24px;padding-top:18px;border-top:1px solid #232636;font-size:12px;line-height:1.6;color:#94a3b8">
            If the button does not work, copy and paste this link into your browser:<br />
            <a href="${inviteUrl}" style="color:#7dd3fc">${inviteUrl}</a>
          </div>
        </div>
      </div>
    </div>
  `;

  const text = [
    `DevANT invitation`,
    `${inviterName} invited you to join ${orgName}.`,
    `Accept it here: ${inviteUrl}`,
    "",
    "If you were not expecting this invitation, you can ignore this email.",
  ].join("\n");

  return { subject, html, text };
}

async function sendInviteEmail(input: {
  to: string;
  orgName: string;
  inviterName: string;
  inviteUrl: string;
}) {
  // Use EmailJS REST API to send templated emails from the server.
  // Requires these env vars: EMAILJS_USER_ID, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID
  const emailjsUser = process.env.EMAILJS_USER_ID;
  const emailjsService = process.env.EMAILJS_SERVICE_ID;
  const emailjsTemplate = process.env.EMAILJS_TEMPLATE_ID;

  if (!emailjsUser || !emailjsService || !emailjsTemplate) {
    throw new Error(
      "EmailJS env missing: please set EMAILJS_USER_ID, EMAILJS_SERVICE_ID, and EMAILJS_TEMPLATE_ID",
    );
  }

  const templateParams = {
    project_name: process.env.DEVANT_PROJECT_NAME ?? "DevANT",
    sender_avatar: "",
    project_avatar: "",
    sender_username: input.inviterName,
    repo_link: input.inviteUrl,
    organization_name: input.orgName,
    repo_name: input.orgName,
    profile_link: "",
    expiry_days: String(process.env.DEVANT_INVITE_EXPIRY_DAYS ?? "7"),
    invitation_link: input.inviteUrl,
    user_email: input.to,
    recipient_username: input.to,
  };

  const body = {
    service_id: emailjsService,
    template_id: emailjsTemplate,
    user_id: emailjsUser,
    template_params: templateParams,
  } as const;

  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const details = await res.text().catch(() => "");
    const msg = `EmailJS send failed: ${res.status} ${details}`;
    console.error("[sendInviteEmail]", msg, body);
    throw new Error(msg);
  }

  console.log(`[sendInviteEmail] EmailJS invite queued for ${input.to}`);
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

    try {
      console.log(
        `[createOrgInvite] Sending invite to ${data.invitedEmail} for org ${org.name}`,
      );
      await sendInviteEmail({
        to: data.invitedEmail,
        orgName: org.name,
        inviterName: data.inviterName,
        inviteUrl: `${data.baseUrl}/invites/${invite.invite_token}`,
      });
      console.log(`[createOrgInvite] Invite successfully sent to ${data.invitedEmail}`);
    } catch (error) {
      console.error(`[createOrgInvite] Failed to send invite to ${data.invitedEmail}:`, error);
      await supabase.from("org_members").delete().eq("id", invite.id);
      throw error;
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
    };
  });
