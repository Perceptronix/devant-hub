import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { useProject } from "@/lib/use-project";
import { getRepo, listCommits, listPulls, listIssues, listDeployments } from "@/lib/github/client";
import { StatCard } from "@/components/StatCard";
import { GitCommit, GitPullRequest, Bug, Rocket } from "lucide-react";
import { useSyncListener } from "@/lib/sync";

export const Route = createFileRoute("/projects/$projectId/")({
  component: ProjectOverview,
});

function ProjectOverview() {
  const { projectId } = useParams({ from: "/projects/$projectId/" });
  const { project } = useProject(projectId);
  const { user } = useAuth();
  const [stats, setStats] = useState({ commits: 0, openPRs: 0, openIssues: 0, deployments: 0, stars: 0, forks: 0 });
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
        const [repo, commits, openPulls, openIssues, deployments] = await Promise.all([
          getRepo(token, project.owner, project.repo).catch(() => null),
          listCommits(token, project.owner, project.repo, { per_page: 100 }).catch(() => []),
          listPulls(token, project.owner, project.repo, "open").catch(() => []),
          listIssues(token, project.owner, project.repo, "open").catch(() => []),
          listDeployments(token, project.owner, project.repo).catch(() => []),
        ]);
        if (!mounted) return;
        setStats({
          commits: commits.length,
          openPRs: openPulls.length,
          openIssues: (openIssues ?? []).filter((i: any) => !i.pull_request).length,
          deployments: deployments.length,
          stars: repo?.stargazers_count ?? 0,
          forks: repo?.forks_count ?? 0,
        });
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [user, project, tick]);

  if (!project) return null;

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight">{project.name}</h1>
        <p className="text-sm text-muted-foreground mt-1 font-mono">{project.owner}/{project.repo}</p>
        {project.description && <p className="text-sm mt-2 max-w-2xl">{project.description}</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Commits" value={stats.commits} icon={GitCommit} accent="primary" />
        <StatCard label="Open PRs" value={stats.openPRs} icon={GitPullRequest} accent="success" />
        <StatCard label="Open Issues" value={stats.openIssues} icon={Bug} accent="warning" />
        <StatCard label="Deployments" value={stats.deployments} icon={Rocket} accent="cyan" />
      </div>

      <div className="glass rounded-xl p-5">
        <div className="text-sm text-muted-foreground">
          {loading ? "Loading live GitHub data…" : "Choose a section from the sidebar to drill in."}
        </div>
        <div className="mt-3 flex gap-3 text-xs">
          <Link to="/projects/$projectId/commits" params={{ projectId }} className="text-primary hover:underline">View commits →</Link>
          <Link to="/projects/$projectId/pulls" params={{ projectId }} className="text-primary hover:underline">Pull requests →</Link>
          <Link to="/projects/$projectId/team" params={{ projectId }} className="text-primary hover:underline">Team →</Link>
        </div>
      </div>
    </>
  );
}
