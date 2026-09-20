/**
 * NavBreadcrumb — Supabase-style segmented breadcrumb.
 *
 * Structure:  [Org ▾] / [Project ▾]
 *
 * Each segment is an independent dropdown trigger that opens directly below itself.
 * State lives in useCurrentOrg (shared singleton via localStorage + custom events) —
 * the same pattern as Supabase's sidebar-manager-state: one source of truth, any
 * component that calls useCurrentOrg reacts to switchOrg() without a page reload.
 *
 * No third tier — DevANT has no branches/environments.
 */

import { useState, useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { Check, ChevronsUpDown, Plus, Building2, FolderGit2, ChevronRight } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCurrentOrg } from "@/lib/current-org";
import { useAuth } from "@/lib/auth";
import { fetchImportedProjects, type ImportedProject } from "@/lib/imported-projects";

// ─── Org segment ────────────────────────────────────────────────────────────

function OrgSegment() {
  const { orgs, currentOrg, switchOrg } = useCurrentOrg();
  const navigate = useNavigate();

  if (orgs.length === 0) {
    return (
      <button
        onClick={() => navigate({ to: "/onboarding" })}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <Building2 className="size-3.5" />
        <span>Create org</span>
      </button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors focus-visible:outline-none group">
        <Building2 className="size-3.5 text-muted-foreground shrink-0" />
        <span className="max-w-[140px] truncate">{currentOrg?.name ?? "Select org"}</span>
        <ChevronsUpDown className="size-3 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={8} className="w-64">
        <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          Organizations
        </div>
        {orgs.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => switchOrg(org.id)}
            className="flex items-center gap-2 text-xs cursor-pointer"
          >
            <Building2 className="size-3.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{org.name}</div>
              <div className="text-[10px] text-muted-foreground truncate">{org.slug}</div>
            </div>
            {currentOrg?.id === org.id && <Check className="size-3.5 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => navigate({ to: "/onboarding" })}
          className="flex items-center gap-2 text-xs cursor-pointer"
        >
          <Plus className="size-3.5" />
          New organization
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => navigate({ to: "/settings", search: { tab: "organizations" } as any })}
          className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground"
        >
          Manage organizations
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Project segment ─────────────────────────────────────────────────────────

function ProjectSegment({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { currentOrg } = useCurrentOrg();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ImportedProject[]>([]);
  const [open, setOpen] = useState(false);

  // Load projects lazily when the dropdown opens — avoids re-fetch on every render.
  // ponytail: no cache layer; re-fetches each open. Acceptable at this scale.
  useEffect(() => {
    if (!open || !user) return;
    fetchImportedProjects(user.id).then((all) => {
      const filtered = currentOrg
        ? all.filter((p) => !p.org_id || p.org_id === currentOrg.id)
        : all;
      setProjects(filtered);
    });
  }, [open, user, currentOrg?.id]);

  // Find current project from what we've loaded, or show the ID while loading.
  const current = projects.find((p) => p.id === projectId);
  const label = current ? `${current.owner}/${current.repo}` : projectId;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors focus-visible:outline-none group">
        <FolderGit2 className="size-3.5 text-muted-foreground shrink-0" />
        <span className="max-w-[160px] truncate">{label}</span>
        <ChevronsUpDown className="size-3 text-muted-foreground opacity-60 group-hover:opacity-100 transition-opacity" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={8} className="w-72">
        <div className="px-2 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
          {currentOrg?.name ?? "Projects"}
        </div>
        {projects.length === 0 ? (
          <div className="px-2 py-3 text-xs text-muted-foreground">No linked projects.</div>
        ) : (
          projects.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onClick={() => {
                setOpen(false);
                navigate({ to: "/projects/$projectId", params: { projectId: p.id } });
              }}
              className="flex items-center gap-2 text-xs cursor-pointer"
            >
              <FolderGit2 className="size-3.5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.owner}/{p.repo}</div>
                {p.description && (
                  <div className="text-[10px] text-muted-foreground truncate">{p.description}</div>
                )}
              </div>
              {p.id === projectId && <Check className="size-3.5 text-primary shrink-0" />}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => { setOpen(false); navigate({ to: "/projects" }); }}
          className="flex items-center gap-2 text-xs cursor-pointer text-muted-foreground"
        >
          All projects →
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Separator ───────────────────────────────────────────────────────────────

function Sep() {
  return <ChevronRight className="size-3.5 text-muted-foreground/40 shrink-0 mx-0.5" />;
}

// ─── Public export ────────────────────────────────────────────────────────────

export function NavBreadcrumb() {
  const path = useRouterState({ select: (s) => s.location.pathname });

  // Extract projectId from path /projects/:id/...
  const projectMatch = path.match(/^\/projects\/([^/]+)/);
  const projectId = projectMatch ? projectMatch[1] : null;

  // Don't show breadcrumb on standalone pages (settings, notifications, etc.)
  // where there's no org/project context to display — just show org.
  return (
    <nav className="flex items-center gap-0.5 min-w-0" aria-label="Breadcrumb">
      <OrgSegment />
      {projectId && (
        <>
          <Sep />
          <ProjectSegment projectId={projectId} />
        </>
      )}
    </nav>
  );
}
