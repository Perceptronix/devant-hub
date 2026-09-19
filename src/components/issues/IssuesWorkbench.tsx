import { useState, useMemo } from "react";
import { Issue, IssueFilter, IssuePriority, IssueStatus, TeamMember } from "@/types/issues";
import { IssueSidebar } from "./IssueSidebar";
import { IssueTable } from "./IssueTable";
import { IssueBoard } from "./IssueBoard";
import { IssueDrawer } from "./IssueDrawer";
import { IssueCommandMenu } from "./IssueCommandMenu";
import { CreateIssueModal } from "./CreateIssueModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  List,
  LayoutGrid,
  X,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const mockTeamMembers: TeamMember[] = [
  { id: "u-1", name: "Alex Chen", email: "alex@devant.io", github_login: "alexchen", avatar_url: "https://github.com/shadcn.png", role: "Maintainer" },
  { id: "u-2", name: "Sarah Miller", email: "sarah@devant.io", github_login: "smiller", avatar_url: "https://github.com/dietrichgebert.png", role: "Senior Engineer" },
  { id: "u-3", name: "David Kim", email: "david@devant.io", github_login: "dkim", role: "Frontend Lead" },
  { id: "u-4", name: "Elena Rostova", email: "elena@devant.io", github_login: "erostova", role: "DevOps Engineer" },
];

const initialIssues: Issue[] = [
  {
    id: "DEV-101",
    title: "Implement Waydev/Apple dark mode palette & high-density layout",
    description: "Align color variables with neutral slate/zinc spec (#09090b canvas, #18181b surface, #27272a border). Ensure 3-column workbench structure with keyboard shortcuts.",
    status: "in_progress",
    priority: "urgent",
    labels: ["frontend", "ui", "design-system"],
    assigned_to: mockTeamMembers[0],
    created_by: mockTeamMembers[1],
    project_id: "devant-hub",
    created_at: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    updated_at: new Date().toISOString(),
    activities: [
      { id: "a-1", issue_id: "DEV-101", user_name: "Alex Chen", action: "changed status to In Progress", timestamp: "2 hours ago" },
      { id: "a-2", issue_id: "DEV-101", user_name: "Sarah Miller", action: "created issue", timestamp: "2 days ago" },
    ],
  },
  {
    id: "DEV-102",
    title: "Add ⌘K Command Palette modal for quick issue search & filters",
    description: "Integrate cmdk primitive for searching issues, toggling views, and executing shortcuts seamlessly.",
    status: "todo",
    priority: "high",
    labels: ["ux", "keyboard-shortcuts"],
    assigned_to: mockTeamMembers[1],
    created_by: mockTeamMembers[0],
    project_id: "devant-hub",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "DEV-103",
    title: "Optimize TanStack Start SSR routing & hydration metrics",
    description: "Audit client bundle size, dynamic imports, and route prefetching for smooth navigation.",
    status: "in_review",
    priority: "medium",
    labels: ["performance", "tanstack"],
    assigned_to: mockTeamMembers[2],
    created_by: mockTeamMembers[0],
    project_id: "devant-hub",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "DEV-104",
    title: "Integrate Supabase realtime task sync with optimistic state",
    description: "Ensure changes to task status or comments emit realtime postgres_changes updates to active team members.",
    status: "backlog",
    priority: "low",
    labels: ["backend", "supabase"],
    assigned_to: mockTeamMembers[3],
    created_by: mockTeamMembers[2],
    project_id: "devant-hub",
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "DEV-105",
    title: "Enforce ponytail minimal code ladder rules across component tree",
    description: "Refactor custom wrappers into native platform primitives and standard library helpers.",
    status: "done",
    priority: "medium",
    labels: ["ponytail", "refactor"],
    assigned_to: mockTeamMembers[0],
    created_by: mockTeamMembers[0],
    project_id: "devant-hub",
    created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

interface IssuesWorkbenchProps {
  initialTaskList?: any[];
  projectId?: string;
}

export function IssuesWorkbench({ initialTaskList, projectId }: IssuesWorkbenchProps) {
  const [issues, setIssues] = useState<Issue[]>(initialIssues);
  const [selectedIssueId, setSelectedIssueId] = useState<string | undefined>("DEV-101");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandMenuOpen, setCommandMenuOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [filter, setFilter] = useState<IssueFilter>({
    status: "all",
    priority: "all",
    assigneeId: "all",
    label: "all",
    searchQuery: "",
    viewMode: "list",
    sidebarView: "all",
  });

  const handleFilterUpdate = (update: Partial<IssueFilter>) => {
    setFilter((prev) => ({ ...prev, ...update }));
  };

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (filter.sidebarView === "active") {
        if (!["todo", "in_progress", "in_review"].includes(issue.status)) return false;
      } else if (filter.sidebarView === "backlog") {
        if (issue.status !== "backlog") return false;
      } else if (filter.sidebarView === "my_issues") {
        if (issue.assigned_to?.id !== mockTeamMembers[0].id) return false;
      }

      if (filter.status !== "all" && issue.status !== filter.status) return false;
      if (filter.priority !== "all" && issue.priority !== filter.priority) return false;

      if (filter.assigneeId === "unassigned") {
        if (issue.assigned_to) return false;
      } else if (filter.assigneeId !== "all" && issue.assigned_to?.id !== filter.assigneeId) {
        return false;
      }

      if (filter.searchQuery.trim()) {
        const q = filter.searchQuery.toLowerCase();
        const matchTitle = issue.title.toLowerCase().includes(q);
        const matchId = issue.id.toLowerCase().includes(q);
        const matchLabel = issue.labels.some((l) => l.toLowerCase().includes(q));
        if (!matchTitle && !matchId && !matchLabel) return false;
      }

      return true;
    });
  }, [issues, filter]);

  const selectedIssue = useMemo(
    () => issues.find((i) => i.id === selectedIssueId) || null,
    [issues, selectedIssueId]
  );

  const handleUpdateStatus = (issueId: string, status: IssueStatus) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, status, updated_at: new Date().toISOString() } : i))
    );
  };

  const handleUpdatePriority = (issueId: string, priority: IssuePriority) => {
    setIssues((prev) =>
      prev.map((i) => (i.id === issueId ? { ...i, priority, updated_at: new Date().toISOString() } : i))
    );
  };

  const handleUpdateIssue = (updated: Issue) => {
    setIssues((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
  };

  const handleDeleteIssue = (issueId: string) => {
    setIssues((prev) => prev.filter((i) => i.id !== issueId));
    if (selectedIssueId === issueId) {
      setSelectedIssueId(undefined);
    }
    toast.success("Issue deleted");
  };

  // Robust, immutable duplicate handling with unique key generation
  const handleDuplicateIssue = (issueToDuplicate: Issue) => {
    const numericIds = issues.map((i) => parseInt(i.id.replace(/\D/g, ""), 10) || 100);
    const nextNumber = Math.max(...numericIds, 100) + 1;
    const newId = `DEV-${nextNumber}`;

    const duplicatedIssue: Issue = {
      ...issueToDuplicate,
      id: newId,
      title: `${issueToDuplicate.title} (Copy)`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activities: [
        {
          id: String(Date.now()),
          issue_id: newId,
          user_name: "You",
          action: `duplicated from ${issueToDuplicate.id}`,
          timestamp: "Just now",
        },
      ],
    };

    setIssues((prev) => [duplicatedIssue, ...prev]);
    setSelectedIssueId(newId);
    toast.success(`Duplicated ${issueToDuplicate.id} as ${newId}`);
  };

  const handleCreateIssue = (newIssuePartial: Partial<Issue>) => {
    const numericIds = issues.map((i) => parseInt(i.id.replace(/\D/g, ""), 10) || 100);
    const nextNumber = Math.max(...numericIds, 100) + 1;

    const fullIssue: Issue = {
      id: newIssuePartial.id || `DEV-${nextNumber}`,
      title: newIssuePartial.title || "Untitled Issue",
      description: newIssuePartial.description,
      status: newIssuePartial.status || "todo",
      priority: newIssuePartial.priority || "medium",
      labels: newIssuePartial.labels || ["general"],
      assigned_to: newIssuePartial.assigned_to,
      created_by: mockTeamMembers[0],
      project_id: projectId || "devant-hub",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      activities: [
        {
          id: String(Date.now()),
          issue_id: newIssuePartial.id || `DEV-${nextNumber}`,
          user_name: "You",
          action: "created issue",
          timestamp: "Just now",
        },
      ],
    };

    setIssues((prev) => [fullIssue, ...prev]);
    setSelectedIssueId(fullIssue.id);
  };

  const hasActiveFilters =
    filter.status !== "all" ||
    filter.priority !== "all" ||
    filter.assigneeId !== "all" ||
    filter.searchQuery.trim() !== "";

  return (
    <div className="flex h-[calc(100vh-64px)] w-full bg-[#09090b] text-zinc-100 overflow-hidden font-sans tracking-tight">
      {/* COLUMN 1: 220px Collapsible Sidebar */}
      <IssueSidebar
        filter={filter}
        onFilterChange={handleFilterUpdate}
        issues={issues}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* COLUMN 2: Main Workbench Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#09090b] h-full overflow-hidden">
        {/* Workbench Topbar */}
        <div className="h-10 px-4 border-b border-[#27272a] flex items-center justify-between shrink-0 bg-[#09090b] select-none">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-zinc-300">DevANT Workbench</span>
            <ChevronRight className="size-3 text-zinc-600" />
            <span className="text-zinc-400 capitalize">
              {filter.sidebarView.replace("_", " ")}
            </span>
            <Badge
              variant="outline"
              className="text-[10px] bg-[#18181b] border-[#27272a] text-zinc-400 px-1.5 py-0 font-mono ml-1"
            >
              {filteredIssues.length} issues
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-[#18181b] border border-[#27272a] rounded-md p-0.5">
              <button
                onClick={() => handleFilterUpdate({ viewMode: "list" })}
                className={cn(
                  "p-1 rounded text-xs transition-colors flex items-center gap-1 px-2",
                  filter.viewMode === "list"
                    ? "bg-[#27272a] text-zinc-100 font-medium"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
                title="List View"
              >
                <List className="size-3.5" />
                <span className="text-[11px] hidden sm:inline">List</span>
              </button>
              <button
                onClick={() => handleFilterUpdate({ viewMode: "board" })}
                className={cn(
                  "p-1 rounded text-xs transition-colors flex items-center gap-1 px-2",
                  filter.viewMode === "board"
                    ? "bg-[#27272a] text-zinc-100 font-medium"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
                title="Board View"
              >
                <LayoutGrid className="size-3.5" />
                <span className="text-[11px] hidden sm:inline">Board</span>
              </button>
            </div>

            <button
              onClick={() => setCommandMenuOpen(true)}
              className="hidden sm:flex items-center gap-2 bg-[#18181b] border border-[#27272a] hover:border-zinc-600 rounded-md px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <Search className="size-3.5" />
              <span>Search...</span>
              <kbd className="font-mono text-[9px] bg-[#27272a] px-1 rounded text-zinc-300 border border-zinc-700">
                ⌘K
              </kbd>
            </button>

            <Button
              onClick={() => setCreateModalOpen(true)}
              size="sm"
              className="h-7 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold text-xs px-2.5"
            >
              <Plus className="size-3.5 mr-1" />
              <span>New Issue</span>
            </Button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="h-9 px-4 border-b border-[#27272a] flex items-center justify-between shrink-0 bg-[#09090b] gap-2 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative w-48 shrink-0">
              <Search className="size-3.5 absolute left-2 top-2 text-zinc-500" />
              <Input
                placeholder="Filter title or label..."
                value={filter.searchQuery}
                onChange={(e) => handleFilterUpdate({ searchQuery: e.target.value })}
                className="h-6 pl-7 bg-[#18181b] border-[#27272a] text-xs text-zinc-200 placeholder:text-zinc-500 focus-visible:ring-zinc-700"
              />
            </div>

            <Select
              value={filter.status}
              onValueChange={(val) => handleFilterUpdate({ status: val ?? "all" })}
            >
              <SelectTrigger className="h-6 w-28 bg-[#18181b] border-[#27272a] text-[11px] text-zinc-300">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-[#27272a] text-xs">
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={filter.priority}
              onValueChange={(val) => handleFilterUpdate({ priority: val ?? "all" })}
            >
              <SelectTrigger className="h-6 w-28 bg-[#18181b] border-[#27272a] text-[11px] text-zinc-300">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-[#27272a] text-xs">
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <button
                onClick={() =>
                  handleFilterUpdate({
                    status: "all",
                    priority: "all",
                    assigneeId: "all",
                    searchQuery: "",
                  })
                }
                className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors px-1"
              >
                <X className="size-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <div className="hidden lg:flex items-center gap-1 text-[11px] text-zinc-500 font-mono">
            <span>Press</span>
            <kbd className="bg-[#18181b] px-1 border border-[#27272a] rounded text-zinc-400">C</kbd>
            <span>to create</span>
          </div>
        </div>

        {/* Issue View Area (List or Board) */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {filter.viewMode === "list" ? (
            <IssueTable
              issues={filteredIssues}
              selectedIssueId={selectedIssueId}
              onSelectIssue={(issue) => setSelectedIssueId(issue.id)}
              onUpdateStatus={handleUpdateStatus}
              onUpdatePriority={handleUpdatePriority}
              onDuplicateIssue={handleDuplicateIssue}
              onDeleteIssue={handleDeleteIssue}
            />
          ) : (
            <IssueBoard
              issues={filteredIssues}
              selectedIssueId={selectedIssueId}
              onSelectIssue={(issue) => setSelectedIssueId(issue.id)}
              onUpdateStatus={handleUpdateStatus}
              onCreateIssue={() => setCreateModalOpen(true)}
            />
          )}
        </div>
      </div>

      {/* COLUMN 3: 320px Contextual Right Drawer */}
      {selectedIssue && (
        <IssueDrawer
          issue={selectedIssue}
          onClose={() => setSelectedIssueId(undefined)}
          onUpdateIssue={handleUpdateIssue}
          onDeleteIssue={handleDeleteIssue}
          onDuplicateIssue={handleDuplicateIssue}
          teamMembers={mockTeamMembers}
        />
      )}

      {/* ⌘K Command Dialog Modal */}
      <IssueCommandMenu
        open={commandMenuOpen}
        onOpenChange={setCommandMenuOpen}
        issues={issues}
        onSelectIssue={(issue) => setSelectedIssueId(issue.id)}
        onCreateIssue={() => setCreateModalOpen(true)}
        onSetFilterView={(view) => handleFilterUpdate({ sidebarView: view })}
        onToggleViewMode={() =>
          handleFilterUpdate({ viewMode: filter.viewMode === "list" ? "board" : "list" })
        }
      />

      {/* Quick Issue Create Modal */}
      <CreateIssueModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onCreateIssue={handleCreateIssue}
        teamMembers={mockTeamMembers}
        nextIssueNumber={Math.max(...issues.map((i) => parseInt(i.id.replace(/\D/g, ""), 10) || 100), 100) + 1}
      />
    </div>
  );
}
