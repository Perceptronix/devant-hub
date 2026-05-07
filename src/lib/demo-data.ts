/** Demo data used until the user signs in with GitHub and links real repos. */

export const demoOrgs = [
  { id: "org-1", name: "Perceptronix", slug: "perceptronix", avatar_url: "" },
];

export const demoDepartments = [
  { id: "d-ml", name: "ML", color: "#6C63FF", icon: "🧠" },
  { id: "d-uiux", name: "UI/UX", color: "#00D4FF", icon: "🎨" },
  { id: "d-3d", name: "3D Design", color: "#FFB800", icon: "🧊" },
  { id: "d-be", name: "Backend", color: "#00FF88", icon: "⚙️" },
  { id: "d-ops", name: "DevOps", color: "#FF4466", icon: "🚀" },
];

export const demoProjects = [
  { id: "p-1", name: "neural-core", dept: "ML", owner: "perceptronix", repo: "neural-core", openPRs: 4, openIssues: 12, lastSha: "a1b2c3d", lastMsg: "feat(model): add attention head pruning", lastSync: "2m ago" },
  { id: "p-2", name: "studio-ui", dept: "UI/UX", owner: "perceptronix", repo: "studio-ui", openPRs: 2, openIssues: 7, lastSha: "9f8e7d6", lastMsg: "fix(button): correct focus ring contrast", lastSync: "12m ago" },
  { id: "p-3", name: "render-engine", dept: "3D Design", owner: "perceptronix", repo: "render-engine", openPRs: 1, openIssues: 3, lastSha: "5d4c3b2", lastMsg: "perf(gpu): reduce VRAM allocation", lastSync: "1h ago" },
  { id: "p-4", name: "api-gateway", dept: "Backend", owner: "perceptronix", repo: "api-gateway", openPRs: 6, openIssues: 18, lastSha: "1a2b3c4", lastMsg: "refactor: extract auth middleware", lastSync: "3h ago" },
  { id: "p-5", name: "deploy-pipeline", dept: "DevOps", owner: "perceptronix", repo: "deploy-pipeline", openPRs: 0, openIssues: 2, lastSha: "7e8f9a0", lastMsg: "ci: parallelize integration tests", lastSync: "yesterday" },
];

export const demoCommits = Array.from({ length: 25 }, (_, i) => ({
  sha: Math.random().toString(16).slice(2, 9),
  author: ["alice", "bob", "carol", "dan", "eve"][i % 5],
  avatar: `https://github.com/identicons/${["alice","bob","carol","dan","eve"][i % 5]}.png`,
  message: [
    "feat: add user preferences page",
    "fix: resolve memory leak in worker pool",
    "refactor: simplify auth middleware chain",
    "perf: optimize image loading with srcset",
    "docs: update API reference",
    "test: add integration tests for billing",
    "chore: bump dependencies",
    "feat(ai): integrate claude streaming responses",
  ][i % 8],
  branch: ["main", "main", "develop", "main"][i % 4],
  date: new Date(Date.now() - i * 3600_000 * (1 + Math.random())).toISOString(),
  additions: Math.floor(Math.random() * 200) + 5,
  deletions: Math.floor(Math.random() * 100),
  files: Math.floor(Math.random() * 12) + 1,
  tags: [["feat"], ["fix"], ["refactor"], ["perf"], ["docs"], ["test"], ["chore"], ["feat", "perf"]][i % 8],
}));

export const demoActivity = [
  { type: "commit", text: "@alice pushed to main", detail: "feat: add attention head pruning", time: "2m ago" },
  { type: "deploy", text: "Deployed to production", detail: "neural-core · v1.4.2 · success", time: "8m ago" },
  { type: "pr", text: "@bob opened PR #134", detail: "Refactor auth middleware", time: "23m ago" },
  { type: "issue", text: "@carol opened issue #88", detail: "VRAM spike on M1 macs", time: "1h ago" },
  { type: "commit", text: "@dan pushed to develop", detail: "refactor: extract billing client", time: "1h ago" },
  { type: "deploy", text: "Deployed to staging", detail: "api-gateway · success", time: "2h ago" },
];

export const demoDeployments = Array.from({ length: 8 }, (_, i) => ({
  id: i + 1,
  env: ["production", "staging", "preview"][i % 3],
  status: ["success", "success", "failure", "in_progress", "success"][i % 5],
  sha: Math.random().toString(16).slice(2, 9),
  ref: ["main", "develop", "feature/x"][i % 3],
  by: ["alice", "bob", "carol"][i % 3],
  time: `${i * 3 + 1}h ago`,
}));

export const demoPRs = Array.from({ length: 6 }, (_, i) => ({
  number: 134 - i,
  title: [
    "Refactor auth middleware chain",
    "Add streaming AI responses",
    "Fix VRAM leak on M1",
    "Bump TanStack Router to v1.168",
    "Implement webhook signature verification",
    "Polish onboarding flow",
  ][i],
  author: ["bob", "alice", "carol", "dan", "eve", "alice"][i],
  head: "feature/x", base: "main",
  additions: 200 + i * 30, deletions: 50 + i * 10, changed: 5 + i,
  state: i < 3 ? "open" : i === 3 ? "merged" : "closed",
  age: `${i + 1}d`,
  reviewers: ["alice", "bob"].slice(0, (i % 2) + 1),
  labels: [["feature"], ["bug"], ["perf"], ["chore"], ["security"], ["ux"]][i],
}));

export const demoIssues = Array.from({ length: 8 }, (_, i) => ({
  number: 88 - i,
  title: [
    "VRAM spike on M1 macs",
    "Login redirect loop on Safari",
    "Webhook 5xx retries hang",
    "Dark mode contrast on links",
    "Search result ranking is off",
    "Memory leak in worker pool",
    "i18n: missing French translations",
    "Empty state CTA misaligned",
  ][i],
  author: ["carol", "dan", "alice", "bob", "eve", "carol", "dan", "alice"][i],
  state: i < 5 ? "open" : "closed",
  labels: [["bug","perf"], ["bug"], ["bug","needs-repro"], ["a11y"], ["enhancement"], ["bug"], ["i18n"], ["ux"]][i],
  age: `${i + 1}d`,
}));

export const demoTeam = {
  owner: { login: "alice", name: "Alice Chen", avatar: "https://github.com/identicons/alice.png", contrib: 412, add: 18420, del: 5210 },
  collaborators: [
    { login: "bob", name: "Bob Singh", avatar: "https://github.com/identicons/bob.png", contrib: 287, add: 11203, del: 4012 },
    { login: "carol", name: "Carol Reyes", avatar: "https://github.com/identicons/carol.png", contrib: 198, add: 7821, del: 2104 },
    { login: "dan", name: "Dan Park", avatar: "https://github.com/identicons/dan.png", contrib: 121, add: 4502, del: 1311 },
  ],
  contributors: [
    { login: "eve", name: "Eve Wang", avatar: "https://github.com/identicons/eve.png", contrib: 67, add: 2103, del: 980 },
    { login: "frank", name: "Frank O.", avatar: "https://github.com/identicons/frank.png", contrib: 22, add: 712, del: 290 },
  ],
};

export const demoMetrics = {
  deployFrequency: 4.2,
  leadTimeHours: 14.6,
  changeFailureRate: 8.3,
  mttrHours: 1.9,
  trend: Array.from({ length: 14 }, (_, i) => ({
    day: `D${i + 1}`,
    deploys: Math.floor(Math.random() * 8) + 1,
    leadTime: Math.random() * 20 + 4,
    failures: Math.random() * 15,
    mttr: Math.random() * 4,
  })),
};

// Sample patch text emulating GitHub commit response
export const demoPatch = `@@ -12,8 +12,15 @@ import { Button } from "@/components/ui/button";
 
 export function Login() {
-  return <button>Sign in</button>;
+  const onClick = async () => {
+    await signInWithGitHub();
+  };
+  return (
+    <Button onClick={onClick} className="gap-2">
+      <GitHubIcon /> Connect with GitHub
+    </Button>
+  );
 }
 
-export const PROVIDER = "google";
+export const PROVIDER = "github";`;
