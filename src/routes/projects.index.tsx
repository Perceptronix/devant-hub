import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Plus, GitPullRequest, Bug, Clock, RefreshCw, Unlink, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth, getGitHubToken } from "@/lib/auth";
import { listUserRepos } from "@/lib/github/client";
import { getSupabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  fetchImportedProjects, insertImportedProject, removeImportedProject, ImportedProject,
} from "@/lib/imported-projects";
import { emitSync, useSyncListener } from "@/lib/sync";
import { useCurrentOrg } from "@/lib/current-org";

export const Route = createFileRoute("/projects/")({
  head: () => ({ meta: [{ title: "Projects — DevANT" }] }),
  component: Projects,
});

function Projects() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { currentOrg } = useCurrentOrg();
  const [repos, setRepos] = useState<any[]>([]);
  const [allProjects, setAllProjects] = useState<ImportedProject[]>([]);
  const [fetchingRepos, setFetchingRepos] = useState(false);
  const [search, setSearch] = useState("");
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<number | string | null>(null);
  const [tick, setTick] = useState(0);
  useSyncListener(() => setTick((n) => n + 1));

  const linkedProjects = currentOrg
    ? allProjects.filter((p) => !p.org_id || p.org_id === currentOrg.id)
    : allProjects;

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user) { setAllProjects([]); return; }
      const projects = await fetchImportedProjects(user.id);
      if (!mounted) return;
      setAllProjects(projects);
    })();
    return () => { mounted = false; };
  }, [user, tick]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!open || !user) return;
      const token = getGitHubToken(user);
      if (!token) return;
      setFetchingRepos(true);
      try {
        const list = await listUserRepos(token);
        if (mounted) setRepos(list);
      } catch (err) { console.error(err); }
      finally { if (mounted) setFetchingRepos(false); }
    })();
    return () => { mounted = false; };
  }, [open, user]);

  async function importRepo(r: any) {
    if (!user) return;
    setImportingId(r.id);
    try {
      const supabase = getSupabase();
      const ownerLogin = String(r.owner?.login ?? "").toLowerCase();
      const [{ data: orgRows }, { data: ownedOrgs }] = await Promise.all([
        supabase
          .from("organizations")
          .select("id, github_org_login, owner_id")
          .eq("github_org_login", ownerLogin)
          .limit(1),
        supabase
          .from("organizations")
          .select("id, github_org_login, owner_id")
          .eq("owner_id", user.id),
      ]);
      const orgId = orgRows?.[0]?.id ?? (ownedOrgs?.length === 1 ? ownedOrgs[0].id : undefined);

      const imported: ImportedProject = {
        id: String(r.id), name: r.name, owner: r.owner?.login ?? "", repo: r.name,
        description: r.description ?? "", defaultBranch: r.default_branch ?? "main",
        private: Boolean(r.private), github_repo_id: r.id, org_id: orgId,
      };
      const inserted = await insertImportedProject(user.id, imported);
      if (inserted) {
        setLinkedProjects((cur) => [inserted, ...cur.filter((p) => !(p.owner === inserted.owner && p.repo === inserted.repo))]);
      }
    } finally {
      setImportingId(null);
    }
  }

  async function disconnectProject(p: ImportedProject) {
    if (!user) return;
    setDisconnectingId(p.id);
    const ok = await removeImportedProject(user.id, p.id);
    if (ok) setLinkedProjects((cur) => cur.filter((x) => x.id !== p.id));
    setDisconnectingId(null);
  }

  const importedKeys = new Set(linkedProjects.map((p) => `${p.owner}/${p.repo}`.toLowerCase()));
  const importedIds = new Set(linkedProjects.map((p) => String(p.github_repo_id ?? p.id)));
  const filteredRepos = repos
    .filter((r) => {
      const fullName = `${r.owner?.login}/${r.name}`.toLowerCase();
      return !importedKeys.has(fullName) && !importedIds.has(String(r.id));
    })
    .filter((r) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return `${r.owner?.login ?? ""}/${r.name ?? ""}`.toLowerCase().includes(q);
    });

  return (
    <>
      <PageHeader
        title="Projects"
        description="All repositories linked to your DevANT workspace."
        action={<Button onClick={() => setOpen(true)} className="gap-1.5"><Plus className="size-4" /> New Project+</Button>}
      />

      {linkedProjects.length === 0 ? (
        <div className="glass rounded-xl p-6">
          <h2 className="font-display font-semibold text-lg">No linked projects yet</h2>
          <p className="text-sm text-muted-foreground mt-2">Click <b>New Project+</b> to import a GitHub repository.</p>
          <Button onClick={() => setOpen(true)} className="gap-1.5 mt-4"><Plus className="size-4" /> New Project+</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {linkedProjects.map((p) => (
            <div key={p.id} className="glass glass-hover rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <Link to="/projects/$projectId" params={{ projectId: p.id } as any} className="font-display font-semibold text-lg hover:text-primary block truncate">{p.name}</Link>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{p.owner}/{p.repo}</div>
                </div>
              </div>
              <div className="text-sm bg-surface-elevated rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <code className="font-mono">{p.defaultBranch ?? "main"}</code>
                  <Clock className="size-3 ml-auto" /> imported
                </div>
                <div className="text-foreground truncate">{p.description || "No description"}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><GitPullRequest className="size-3.5" /> live</span>
                  <span className="flex items-center gap-1"><Bug className="size-3.5" /> live</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={() => emitSync(p.id)}>
                    <RefreshCw className="size-3" /> Sync
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs text-danger hover:text-danger"><Unlink className="size-3" /> Disconnect</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect project?</AlertDialogTitle>
                        <AlertDialogDescription>This removes {p.owner}/{p.repo} from DevANT. The repo on GitHub is unaffected.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => disconnectProject(p)} disabled={disconnectingId === p.id}>
                          {disconnectingId === p.id ? "Disconnecting…" : "Disconnect"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[min(42rem,calc(100vw-1rem))] sm:max-w-none">
          <DialogHeader><DialogTitle className="font-display">Link a Repository</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <Input placeholder="Search your GitHub repos…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="text-xs text-muted-foreground">
              {user ? "Already-linked projects are hidden." : "Sign in with GitHub first."}
            </div>
            {user ? (
                <div className="max-h-96 overflow-y-auto overflow-x-hidden mt-2 space-y-2 pr-1 rounded-lg border border-border/60 bg-surface/30 p-1">
                {fetchingRepos ? (
                  <div className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="size-4 animate-spin" /> Loading repositories…</div>
                ) : filteredRepos.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No repositories available to import.</div>
                ) : filteredRepos.map((r) => (
                    <div key={r.id} className="grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-md px-3 py-2 hover:bg-surface-elevated overflow-hidden">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.owner?.login}/{r.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.description ?? "No description"}</div>
                    </div>
                      <Button size="sm" className="gap-1 shrink-0 self-center" onClick={() => importRepo(r)} disabled={importingId === r.id}>
                      {importingId === r.id ? <><Loader2 className="size-3 animate-spin" /> Importing…</> : "Import"}
                    </Button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
