import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, Users2, GitFork, Link2 } from "lucide-react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { getSupabase } from "@/integrations/supabase/client";
import { useProject } from "@/lib/use-project";
import { getCommit, getRepo, listAllCommits, listCollaborators, listContributors } from "@/lib/github/client";
import { useSyncListener } from "@/lib/sync";

type Member = { login: string; name: string; avatar: string; contrib: number; add: number; del: number; role: "owner" | "collaborator" | "contributor" };

export const Route = createFileRoute("/projects/$projectId/team")({
  component: Team,
});

function Team() {
  const { projectId } = useParams({ from: "/projects/$projectId/team" });
  const { project } = useProject(projectId);
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [linkedLogins, setLinkedLogins] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);
  useSyncListener(() => setTick((n) => n + 1));

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user || !project) return;
      const token = getGitHubToken(user);
      if (!token) return;
      setLoading(true);
      try {
        const supabase = getSupabase();
        const { data: linkedMembers } = await supabase
          .from("project_team_members")
          .select("github_login, linked_user_id")
          .eq("project_id", project.id)
          .not("linked_user_id", "is", null);
        const linkedSet = new Set((linkedMembers ?? []).map((row: any) => String(row.github_login).toLowerCase()));

        // If this project belongs to an organization, also treat accepted org_members
        // as linked so team view and linked badges reflect organization membership.
        if (project.org_id) {
          try {
            const { data: orgLinked } = await supabase
              .from("org_members")
              .select("github_login")
              .eq("org_id", project.org_id)
              .eq("status", "accepted");
            for (const row of orgLinked ?? []) {
              if (row && row.github_login) linkedSet.add(String(row.github_login).toLowerCase());
            }
          } catch (e) {
            console.error("Failed to load org-linked members for team view:", e);
          }
        }

        const [repo, collabs, contribs, commits] = await Promise.all([
          getRepo(token, project.owner, project.repo),
          listCollaborators(token, project.owner, project.repo).catch(() => []),
          listContributors(token, project.owner, project.repo).catch(() => []),
          listAllCommits(token, project.owner, project.repo, { per_page: 100 }, 300).catch(() => []),
        ]);

        // Compute add/del per author from commit details
        const detailBatch = await Promise.all(commits.map(async (c: any) => {
          try { const d = await getCommit(token, project.owner, project.repo, c.sha); return { c, d }; }
          catch { return { c, d: null }; }
        }));

        const byLogin = new Map<string, Member>();
        const ensure = (login: string, avatar = "") => {
          let m = byLogin.get(login);
          if (!m) { m = { login, name: login, avatar, contrib: 0, add: 0, del: 0, role: "contributor" }; byLogin.set(login, m); }
          if (!m.avatar && avatar) m.avatar = avatar;
          return m;
        };

        for (const { c, d } of detailBatch) {
          const login = c.author?.login ?? c.commit?.author?.name ?? "unknown";
          const m = ensure(login, c.author?.avatar_url ?? "");
          m.contrib += 1;
          m.add += d?.stats?.additions ?? 0;
          m.del += d?.stats?.deletions ?? 0;
        }
        // Add contributors (commit counts from API), keep our line counts
        for (const cb of contribs ?? []) {
          const m = ensure(cb.login, cb.avatar_url ?? "");
          if (m.contrib === 0) m.contrib = cb.contributions ?? 0;
        }
        // Owner
        const ownerLogin = repo.owner?.login ?? project.owner;
        const ownerM = ensure(ownerLogin, repo.owner?.avatar_url ?? "");
        ownerM.role = "owner";
        // Collaborators
        for (const cl of collabs ?? []) {
          const m = ensure(cl.login, cl.avatar_url ?? "");
          if (m.role === "contributor") m.role = "collaborator";
        }

        if (!mounted) return;
        setLinkedLogins(linkedSet);
        setMembers(Array.from(byLogin.values()).sort((a, b) => b.contrib - a.contrib));
      } finally { if (mounted) setLoading(false); }
    })();
    return () => { mounted = false; };
  }, [user, project, tick]);

  const owner = members.find((m) => m.role === "owner");
  const collaborators = members.filter((m) => m.role === "collaborator");
  const contributors = members.filter((m) => m.role === "contributor");

  return (
    <>
      <h1 className="text-2xl font-display font-bold mb-4">Team</h1>
      {loading && members.length === 0 ? <div className="glass rounded-xl p-6 text-sm text-muted-foreground">Loading team…</div> : null}

      <Section title="Owner" icon={Crown} accent="warning">
        {owner ? <MemberCard m={owner} linked={linkedLogins.has(owner.login.toLowerCase())} /> : <Empty />}
      </Section>
      <Section title="Collaborators" icon={Users2} accent="primary">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {collaborators.length === 0 ? <Empty /> : collaborators.map((m) => <MemberCard key={m.login} m={m} linked={linkedLogins.has(m.login.toLowerCase())} />)}
        </div>
      </Section>
      <Section title="Contributors" icon={GitFork} accent="cyan">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {contributors.length === 0 ? <Empty /> : contributors.map((m) => <MemberCard key={m.login} m={m} />)}
        </div>
      </Section>
    </>
  );
}

function MemberCard({ m, linked }: { m: Member; linked?: boolean }) {
  return (
    <div className="glass glass-hover rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Avatar className="size-12"><AvatarImage src={m.avatar} /><AvatarFallback>{m.name[0]?.toUpperCase()}</AvatarFallback></Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold truncate">{m.name}</span>
            {linked && <Badge variant="outline" className="text-[9px] border-success/40 text-success gap-1"><Link2 className="size-2.5" /> Linked</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">@{m.login}</div>
          <div className="flex gap-3 text-xs mt-2 font-mono flex-wrap">
            <span>{m.contrib} commits</span>
            <span className="text-success">+{m.add.toLocaleString()}</span>
            <span className="text-danger">-{m.del.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
function Empty() { return <div className="text-xs text-muted-foreground">None.</div>; }
function Section({ title, icon: Icon, accent, children }: { title: string; icon: React.ComponentType<{ className?: string }>; accent: string; children: React.ReactNode }) {
  const map: Record<string, string> = { warning: "text-warning", primary: "text-primary", cyan: "text-cyan" };
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3"><Icon className={`size-4 ${map[accent]}`} /><h2 className="font-display font-semibold text-lg">{title}</h2></div>
      {children}
    </div>
  );
}
