import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Crown, Users2, GitFork, Link2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { getSelectedImportedProject } from "@/lib/imported-projects";
import { getRepo, listCollaborators, listContributors } from "@/lib/github/client";

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

  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!user) return;
      const selected = getSelectedImportedProject(user.id);
      const token = getGitHubToken(user);
      if (!selected || !token) {
        setOwner(null);
        setCollaborators([]);
        setContributors([]);
        return;
      }

      try {
        const [repo, collabs, contribs] = await Promise.all([
          getRepo(token, selected.owner, selected.repo),
          listCollaborators(token, selected.owner, selected.repo),
          listContributors(token, selected.owner, selected.repo),
        ]);

        if (!mounted) return;
        setOwner({
          login: repo.owner?.login ?? selected.owner,
          name: repo.owner?.login ?? selected.owner,
          avatar: repo.owner?.avatar_url ?? "",
          contrib: 0,
          add: 0,
          del: 0,
        });

        setCollaborators(
          collabs.map((m: any) => ({
            login: m.login,
            name: m.login,
            avatar: m.avatar_url ?? "",
            contrib: 0,
            add: 0,
            del: 0,
          }))
        );

        setContributors(
          contribs.map((m: any) => ({
            login: m.login,
            name: m.login,
            avatar: m.avatar_url ?? "",
            contrib: m.contributions ?? 0,
            add: 0,
            del: 0,
          }))
        );
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
      <PageHeader title="Team" description="Members fetched from GitHub, grouped by access level." />
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
