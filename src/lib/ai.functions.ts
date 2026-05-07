import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  message: z.string().min(1).max(2000),
  files: z.array(z.object({
    filename: z.string().max(500),
    patch: z.string().max(50_000).optional().nullable(),
  })).max(20),
});

/**
 * Server function that summarizes a commit with Anthropic Claude.
 * Returns { summary, tags }.
 */
export const summarizeCommit = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return { summary: "AI summary unavailable — ANTHROPIC_API_KEY not set.", tags: [] as string[] };
    }

    const patchSummary = data.files
      .map((f) => `### ${f.filename}\n${(f.patch ?? "").slice(0, 4000)}`)
      .join("\n\n")
      .slice(0, 16_000);

    const prompt = `You are a senior developer. Analyze this git commit and respond as JSON only.

Commit message:
${data.message}

Files & patches:
${patchSummary}

Respond exactly as JSON: { "summary": "2-3 sentence plain-English explanation", "tags": ["3-5 tags from: feat, fix, perf, refactor, test, docs, chore, style, ci"] }`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 500,
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => "");
        console.error("Claude error", res.status, t);
        return { summary: `AI summary failed (${res.status}).`, tags: [] };
      }
      const json = await res.json() as { content?: Array<{ text?: string }> };
      const text = json.content?.[0]?.text ?? "";
      const m = text.match(/\{[\s\S]*\}/);
      if (!m) return { summary: text.slice(0, 500), tags: [] };
      const parsed = JSON.parse(m[0]) as { summary?: string; tags?: string[] };
      return {
        summary: parsed.summary ?? "",
        tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 5) : [],
      };
    } catch (err) {
      console.error("AI summary failed", err);
      return { summary: "AI summary unavailable.", tags: [] };
    }
  });
