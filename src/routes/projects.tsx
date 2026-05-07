import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, GitPullRequest, Bug, Clock, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { listUserRepos } from "@/lib/github/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  fetchImportedProjects,
  insertImportedProject,
  ImportedProject,
  setSelectedImportedProject,
} from "@/lib/imported-projects";

export const Route = createFileRoute("/projects")({
  head: () => ({ meta: [{ title: "Projects — DevANT" }] }),
  component: Projects,
});

function Projects() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const [repos, setRepos] = useState<any[]>([]);
  const [linkedProjects, setLinkedProjects] = useState<ImportedProject[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadLinkedProjects() {
      if (!user) {
        setLinkedProjects([]);
        return;
      }
      const projects = await fetchImportedProjects(user.id);
      if (!mounted) return;
      setLinkedProjects(projects);
    }

    loadLinkedProjects();
    return () => {
      mounted = false;
    };
  }, [user]);

  // Fetch GitHub repos only when user opens the dialog.
  useEffect(() => {
    let mounted = true;
    async function load() {
      if (!open) return;
      if (!user) return;
      const token = getGitHubToken(user);
      if (!token) return;
      setFetchingRepos(true);
      try {
        const list = await listUserRepos(token);
        if (!mounted) return;
        setRepos(list);
      } catch (err) {
        console.error("Failed to load user repos", err);
      } finally {
        setFetchingRepos(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [open, user]);

  async function importRepo(r: any) {
    if (!user) return;

    const imported: ImportedProject = {
      id: String(r.id),
      name: r.name,
      owner: r.owner?.login ?? "",
      repo: r.name,
      description: r.description ?? "",
      defaultBranch: r.default_branch ?? "main",
      private: Boolean(r.private),
    };

    const inserted = await insertImportedProject(user.id, imported);
    if (inserted) {
      setLinkedProjects((cur) => [inserted, ...cur.filter((p) => !(p.owner === inserted.owner && p.repo === inserted.repo))]);
      setSelectedImportedProject(user.id, inserted);
    }
  }

  const filteredRepos = repos.filter((r) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    const full = `${r.owner?.login ?? ""}/${r.name ?? ""}`.toLowerCase();
    return full.includes(q);
  });

  return (
    <>
      <PageHeader
        title="Projects"
        description="All repositories linked across your organization."
        action={<Button onClick={() => setOpen(true)} className="gap-1.5"><Plus className="size-4" /> New Project+</Button>}
      />

      {linkedProjects.length === 0 ? (
        <div className="glass rounded-xl p-6 animate-fade-up">
          <h2 className="font-display font-semibold text-lg">No linked projects yet</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Your dashboard is empty until you import repositories.
          </p>
          <Button onClick={() => setOpen(true)} className="gap-1.5 mt-4"><Plus className="size-4" /> New Project+</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {linkedProjects.map((p) => {
          return (
            <div key={p.id} className="glass glass-hover rounded-xl p-5 animate-fade-up">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Link to="/commits" className="font-display font-semibold text-lg hover:text-primary transition-colors" onClick={() => user && setSelectedImportedProject(user.id, p)}>{p.name}</Link>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5">{p.owner}/{p.repo}</div>
                </div>
              </div>

              <div className="text-sm bg-surface-elevated rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <code className="font-mono">{p.defaultBranch ?? "main"}</code>
                  <Clock className="size-3 ml-auto" /> imported
                </div>
                <div className="text-foreground truncate">{p.description || "No repository description"}</div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><GitPullRequest className="size-3.5" /> live</span>
                  <span className="flex items-center gap-1"><Bug className="size-3.5" /> live</span>
                </div>
                <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs"><RefreshCw className="size-3" /> Sync</Button>
              </div>
            </div>
          );
        })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Link a Repository</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <Input placeholder="Search your GitHub repos…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="text-xs text-muted-foreground">
                {user ? "Select a repository to import and register webhooks." : "Sign in with GitHub to enable repo search and webhook registration."}
              </div>

              {user ? (
                <div className="max-h-96 overflow-auto mt-2 space-y-2">
                  {fetchingRepos ? (
                    <div className="text-sm text-muted-foreground">Loading repositories…</div>
                  ) : filteredRepos.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-2 rounded hover:bg-surface-elevated group">
                      <div>
                        <div className="font-medium">{r.owner?.login}/{r.name}</div>
                        <div className="text-xs text-muted-foreground">{r.description ?? "No description"}</div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" className="gap-1" onClick={() => importRepo(r)}>Import</Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="text-sm text-muted-foreground">Sign in first to import repositories.</div>
                </>
              )}
            </div>
          </DialogContent>
      </Dialog>
    </>
  );
}
