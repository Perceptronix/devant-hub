import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Crown, Users2, GitFork, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { fetchImportedProjects } from "@/lib/imported-projects";
import { getCommit, getRepo, listAllCommits, listCollaborators, listContributors } from "@/lib/github/client";
import { StatCard } from "@/components/StatCard";
import { GitCommit, Plus, Minus } from "lucide-react";

export const Route = createFileRoute("/team")({
  head: () => ({ meta: [{ title: "Team — DevANT" }] }),
  component: Team,
});

type Member = { login: string; name: string; avatar: string; contrib: number; add: number; del: number };

function MemberCard({ m, role, linked }: { m: Member; role: string; linked?: boolean }) {
  return (
    <div className="glass glass-hover rounded-xl p-4 animate-fade-up">
      <div className="flex items-start gap-3">
        <Avatar className="size-12">
          <AvatarImage src={m.avatar} />
          <AvatarFallback>{m.name[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold truncate">{m.name}</span>
            {linked && <Badge variant="outline" className="text-[9px] border-success/40 text-success gap-1"><Link2 className="size-2.5" /> Linked</Badge>}
          </div>
          <div className="text-xs text-muted-foreground">@{m.login}</div>
          <div className="flex gap-3 text-xs mt-2 font-mono">
            <span>{m.contrib} commits</span>
            <span className="text-success">+{m.add.toLocaleString()}</span>
            <span className="text-danger">-{m.del.toLocaleString()}</span>
          </div>
        </div>
      </div>
      {role === "owner" || role === "collaborator" ? (
        <div className="mt-4 pt-3 border-t border-border space-y-1.5">
          <Permission label="Can assign tasks" />
          <Permission label="Can create tasks" />
          <Permission label="Can edit tasks" />
        </div>
      ) : null}
    </div>
  );
}

function Permission({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Switch />
    </div>
  );
}

function Team() {
  const { user } = useAuth();
  const [owner, setOwner] = useState<Member | null>(null);
  const [collaborators, setCollaborators] = useState<Member[]>([]);
  const [contributors, setContributors] = useState<Member[]>([]);
  const [summary, setSummary] = useState({ commits: 0, added: 0, removed: 0 });

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) return;
      const token = getGitHubToken(user);
      if (!token) {
        setOwner(null);
        setCollaborators([]);
        setContributors([]);
        setSummary({ commits: 0, added: 0, removed: 0 });
        return;
      }

      try {
        const projects = await fetchImportedProjects(user.id);
        if (!projects.length) {
          setOwner(null);
          setCollaborators([]);
          setContributors([]);
          setSummary({ commits: 0, added: 0, removed: 0 });
          return;
        }

        const memberMap = new Map<string, Member & { role: "owner" | "collaborator" | "contributor" }>();
        let totalCommits = 0;
        let totalAdded = 0;
        let totalRemoved = 0;

        const roleRank: Record<string, number> = { contributor: 1, collaborator: 2, owner: 3 };
        const upgradeMember = (entry: Member & { role: "owner" | "collaborator" | "contributor" }) => {
          const current = memberMap.get(entry.login);
          if (!current || roleRank[entry.role] >= roleRank[current.role]) {
            memberMap.set(entry.login, entry);
          }
        };

        for (const project of projects) {
          const [repo, collabs, contribs, commits] = await Promise.all([
            getRepo(token, project.owner, project.repo),
            listCollaborators(token, project.owner, project.repo),
            listContributors(token, project.owner, project.repo),
            listAllCommits(token, project.owner, project.repo, { per_page: 100 }, 500),
          ]);

          const contribMap = new Map<string, number>();
          for (const m of contribs ?? []) {
            contribMap.set(m.login, m.contributions ?? 0);
          }

          totalCommits += commits.length;

          const commitDetailBatch = await Promise.all(
            commits.map(async (commit: any) => {
              try {
                const detail = await getCommit(token, project.owner, project.repo, commit.sha);
                return { commit, detail };
              } catch {
                return { commit, detail: null };
              }
            })
          );

          for (const item of commitDetailBatch) {
            const authorLogin = item.commit.author?.login ?? item.commit.commit?.author?.name ?? project.owner;
            const additions = item.detail?.stats?.additions ?? 0;
            const deletions = item.detail?.stats?.deletions ?? 0;
            totalAdded += additions;
            totalRemoved += deletions;
            const current = memberMap.get(authorLogin);
            memberMap.set(authorLogin, {
              login: authorLogin,
              name: item.commit.author?.login ?? item.commit.commit?.author?.name ?? authorLogin,
              avatar: item.commit.author?.avatar_url ?? current?.avatar ?? repo.owner?.avatar_url ?? "",
              contrib: (current?.contrib ?? 0) + 1,
              add: (current?.add ?? 0) + additions,
              del: (current?.del ?? 0) + deletions,
              role: current?.role ?? "contributor",
            });
          }

          const ownerLogin = repo.owner?.login ?? project.owner;
          upgradeMember({
            login: ownerLogin,
            name: repo.owner?.login ?? project.owner,
            avatar: repo.owner?.avatar_url ?? "",
            contrib: contribMap.get(ownerLogin) ?? 0,
            add: 0,
            del: 0,
            role: "owner",
          });

          for (const m of collabs ?? []) {
            upgradeMember({
              login: m.login,
              name: m.login,
              avatar: m.avatar_url ?? "",
              contrib: contribMap.get(m.login) ?? 0,
              add: 0,
              del: 0,
              role: "collaborator",
            });
          }
        }

        if (!mounted) return;
        const all = Array.from(memberMap.values()).sort((a, b) => b.contrib - a.contrib || b.add - a.add);
        setSummary({ commits: totalCommits, added: totalAdded, removed: totalRemoved });
        setOwner(all.find((m) => m.role === "owner") ?? null);
        setCollaborators(all.filter((m) => m.role === "collaborator"));
        setContributors(all.filter((m) => m.role === "contributor"));
      } catch (err) {
        console.error("Failed to load team", err);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [user]);

  return (
    <>
      <PageHeader title="Team" description="Aggregated leaderboard across all imported projects." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Commits" value={summary.commits.toString()} icon={GitCommit} accent="primary" />
        <StatCard label="Lines Added" value={`+${summary.added.toLocaleString()}`} icon={Plus} accent="success" />
        <StatCard label="Lines Removed" value={`-${summary.removed.toLocaleString()}`} icon={Minus} accent="danger" />
        <StatCard label="Contributors" value={(contributors.length + collaborators.length + (owner ? 1 : 0)).toString()} icon={Users2} accent="cyan" />
      </div>
      {!user ? (
        <div className="glass rounded-xl p-6 mb-6">Sign in and import a project first.</div>
      ) : !owner ? (
        <div className="glass rounded-xl p-6 mb-6">No team data yet. Import a project from New Project+ first.</div>
      ) : null}

      <Section title="Owner" icon={Crown} accent="warning">
        {owner ? <MemberCard m={owner} role="owner" linked /> : null}
      </Section>

      <Section title="Collaborators" icon={Users2} accent="primary">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {collaborators.map((m, i) => <MemberCard key={m.login} m={m} role="collaborator" linked={i === 0} />)}
        </div>
      </Section>

      <Section title="Contributors" icon={GitFork} accent="cyan">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {contributors.map((m) => <MemberCard key={m.login} m={m} role="contributor" />)}
        </div>
      </Section>
    </>
  );
}

function Section({ title, icon: Icon, accent, children }: { title: string; icon: React.ComponentType<{ className?: string }>; accent: string; children: React.ReactNode }) {
  const map: Record<string, string> = { warning: "text-warning", primary: "text-primary", cyan: "text-cyan" };
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Icon className={`size-4 ${map[accent]}`} />
        <h2 className="font-display font-semibold text-lg">{title}</h2>
      </div>
      {children}
    </div>
  );
}
