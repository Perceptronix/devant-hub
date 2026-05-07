import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

/**
 * GitHub webhook receiver.
 * URL: https://<your-app>/api/public/github-webhook
 * Configure with secret = GITHUB_WEBHOOK_SECRET.
 * Subscribed events suggested: push, pull_request, issues, deployment, deployment_status.
 */
export const Route = createFileRoute("/api/public/github-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.GITHUB_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Webhook secret not configured", { status: 500 });
        }

        const signature = request.headers.get("x-hub-signature-256");
        const event = request.headers.get("x-github-event") || "unknown";
        const delivery = request.headers.get("x-github-delivery") || "";
        const body = await request.text();

        if (!signature) {
          return new Response("Missing signature", { status: 401 });
        }

        const expected = "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
          return new Response("Invalid signature", { status: 401 });
        }

        // Parse and route
        let payload: unknown;
        try { payload = JSON.parse(body); } catch { return new Response("Bad JSON", { status: 400 }); }

        // For now we just log — in production, write to Supabase webhook_events
        // and dispatch by event type to update commits / pull_requests / issues / deployments.
        console.log(`[webhook] event=${event} delivery=${delivery}`, JSON.stringify(payload).slice(0, 200));

        return new Response(JSON.stringify({ ok: true, event, delivery }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
