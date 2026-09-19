import { useState } from "react";
import { Issue, IssueFilter, IssuePriority, IssueStatus } from "@/types/issues";
import {
  Inbox,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Flame,
  User,
  Tag,
  ChevronDown,
  ChevronRight,
  Filter,
  SlidersHorizontal,
  ChevronLeft,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IssueSidebarProps {
  filter: IssueFilter;
  onFilterChange: (update: Partial<IssueFilter>) => void;
  issues: Issue[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function IssueSidebar({
  filter,
  onFilterChange,
  issues,
  isCollapsed,
  onToggleCollapse,
}: IssueSidebarProps) {
  const [showStatusFilter, setShowStatusFilter] = useState(true);
  const [showPriorityFilter, setShowPriorityFilter] = useState(true);

  // Compute counts
  const totalCount = issues.length;
  const activeCount = issues.filter((i) => ["todo", "in_progress", "in_review"].includes(i.status)).length;
  const backlogCount = issues.filter((i) => i.status === "backlog").length;
  const doneCount = issues.filter((i) => i.status === "done").length;

  const countByStatus: Record<IssueStatus, number> = {
    backlog: issues.filter((i) => i.status === "backlog").length,
    todo: issues.filter((i) => i.status === "todo").length,
    in_progress: issues.filter((i) => i.status === "in_progress").length,
    in_review: issues.filter((i) => i.status === "in_review").length,
    done: issues.filter((i) => i.status === "done").length,
    canceled: issues.filter((i) => i.status === "canceled").length,
  };

  const countByPriority: Record<IssuePriority, number> = {
    urgent: issues.filter((i) => i.priority === "urgent").length,
    high: issues.filter((i) => i.priority === "high").length,
    medium: issues.filter((i) => i.priority === "medium").length,
    low: issues.filter((i) => i.priority === "low").length,
    no_priority: issues.filter((i) => i.priority === "no_priority").length,
  };

  if (isCollapsed) {
    return (
      <div className="w-12 shrink-0 border-r border-[#27272a] bg-[#09090b] flex flex-col items-center py-3 gap-4">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 rounded-md hover:bg-[#18181b] text-zinc-400 hover:text-zinc-100 transition-colors"
          title="Expand Sidebar"
        >
          <ChevronRight className="size-4" />
        </button>

        <div className="flex flex-col gap-2 w-full px-2">
          <button
            onClick={() => onFilterChange({ sidebarView: "all", status: "all" })}
            className={cn(
              "p-2 rounded-md flex items-center justify-center transition-colors text-xs",
              filter.sidebarView === "all"
                ? "bg-[#18181b] text-zinc-100"
                : "text-zinc-400 hover:bg-[#18181b]/60 hover:text-zinc-200"
            )}
            title="All Issues"
          >
            <Inbox className="size-4" />
          </button>

          <button
            onClick={() => onFilterChange({ sidebarView: "active" })}
            className={cn(
              "p-2 rounded-md flex items-center justify-center transition-colors text-xs",
              filter.sidebarView === "active"
                ? "bg-[#18181b] text-zinc-100"
                : "text-zinc-400 hover:bg-[#18181b]/60 hover:text-zinc-200"
            )}
            title="Active"
          >
            <Clock className="size-4" />
          </button>

          <button
            onClick={() => onFilterChange({ sidebarView: "my_issues" })}
            className={cn(
              "p-2 rounded-md flex items-center justify-center transition-colors text-xs",
              filter.sidebarView === "my_issues"
                ? "bg-[#18181b] text-zinc-100"
                : "text-zinc-400 hover:bg-[#18181b]/60 hover:text-zinc-200"
            )}
            title="Assigned to me"
          >
            <User className="size-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[220px] shrink-0 border-r border-[#27272a] bg-[#09090b] flex flex-col h-full select-none text-xs">
      {/* Sidebar Header */}
      <div className="h-10 px-3 border-b border-[#27272a] flex items-center justify-between text-zinc-400 font-medium">
        <span className="text-[11px] tracking-tight uppercase font-semibold text-zinc-400">
          Workbench Views
        </span>
        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-md hover:bg-[#18181b] text-zinc-400 hover:text-zinc-200 transition-colors"
          title="Collapse Sidebar"
        >
          <ChevronLeft className="size-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-4 scrollbar-thin">
        {/* Main Views */}
        <div className="space-y-0.5">
          <button
            onClick={() => onFilterChange({ sidebarView: "all", status: "all", priority: "all" })}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium text-xs transition-colors",
              filter.sidebarView === "all" && filter.status === "all" && filter.priority === "all"
                ? "bg-[#18181b] text-zinc-100"
                : "text-zinc-400 hover:bg-[#18181b]/60 hover:text-zinc-200"
            )}
          >
            <div className="flex items-center gap-2">
              <Inbox className="size-3.5 text-zinc-400" />
              <span>All Issues</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">{totalCount}</span>
          </button>

          <button
            onClick={() => onFilterChange({ sidebarView: "active" })}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium text-xs transition-colors",
              filter.sidebarView === "active"
                ? "bg-[#18181b] text-zinc-100"
                : "text-zinc-400 hover:bg-[#18181b]/60 hover:text-zinc-200"
            )}
          >
            <div className="flex items-center gap-2">
              <Clock className="size-3.5 text-amber-500/80" />
              <span>Active</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">{activeCount}</span>
          </button>

          <button
            onClick={() => onFilterChange({ sidebarView: "my_issues" })}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium text-xs transition-colors",
              filter.sidebarView === "my_issues"
                ? "bg-[#18181b] text-zinc-100"
                : "text-zinc-400 hover:bg-[#18181b]/60 hover:text-zinc-200"
            )}
          >
            <div className="flex items-center gap-2">
              <User className="size-3.5 text-blue-400" />
              <span>My Issues</span>
            </div>
          </button>

          <button
            onClick={() => onFilterChange({ sidebarView: "backlog" })}
            className={cn(
              "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md font-medium text-xs transition-colors",
              filter.sidebarView === "backlog"
                ? "bg-[#18181b] text-zinc-100"
                : "text-zinc-400 hover:bg-[#18181b]/60 hover:text-zinc-200"
            )}
          >
            <div className="flex items-center gap-2">
              <Circle className="size-3.5 text-zinc-500" />
              <span>Backlog</span>
            </div>
            <span className="text-[10px] font-mono text-zinc-500">{backlogCount}</span>
          </button>
        </div>

        {/* Status Filter Section */}
        <div>
          <button
            onClick={() => setShowStatusFilter(!showStatusFilter)}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-tight hover:text-zinc-300 transition-colors mb-1"
          >
            <span>Status</span>
            {showStatusFilter ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>

          {showStatusFilter && (
            <div className="space-y-0.5">
              {(
                [
                  { id: "todo", label: "To Do", icon: Circle, color: "text-zinc-400" },
                  { id: "in_progress", label: "In Progress", icon: Clock, color: "text-amber-400" },
                  { id: "in_review", label: "In Review", icon: SlidersHorizontal, color: "text-purple-400" },
                  { id: "done", label: "Done", icon: CheckCircle2, color: "text-emerald-400" },
                  { id: "canceled", label: "Canceled", icon: Circle, color: "text-zinc-600" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  onClick={() =>
                    onFilterChange({
                      status: filter.status === s.id ? "all" : s.id,
                      sidebarView: "all",
                    })
                  }
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1 rounded-md text-xs transition-colors",
                    filter.status === s.id
                      ? "bg-[#18181b] text-zinc-100 font-medium"
                      : "text-zinc-400 hover:bg-[#18181b]/50 hover:text-zinc-200"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <s.icon className={cn("size-3 shrink-0", s.color)} />
                    <span className="truncate">{s.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                    {countByStatus[s.id]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Priority Filter Section */}
        <div>
          <button
            onClick={() => setShowPriorityFilter(!showPriorityFilter)}
            className="w-full flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-zinc-400 uppercase tracking-tight hover:text-zinc-300 transition-colors mb-1"
          >
            <span>Priority</span>
            {showPriorityFilter ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>

          {showPriorityFilter && (
            <div className="space-y-0.5">
              {(
                [
                  { id: "urgent", label: "Urgent", icon: Flame, color: "text-red-400" },
                  { id: "high", label: "High", icon: AlertTriangle, color: "text-amber-400" },
                  { id: "medium", label: "Medium", icon: Filter, color: "text-blue-400" },
                  { id: "low", label: "Low", icon: Circle, color: "text-zinc-400" },
                ] as const
              ).map((p) => (
                <button
                  key={p.id}
                  onClick={() =>
                    onFilterChange({
                      priority: filter.priority === p.id ? "all" : p.id,
                      sidebarView: "all",
                    })
                  }
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1 rounded-md text-xs transition-colors",
                    filter.priority === p.id
                      ? "bg-[#18181b] text-zinc-100 font-medium"
                      : "text-zinc-400 hover:bg-[#18181b]/50 hover:text-zinc-200"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <p.icon className={cn("size-3 shrink-0", p.color)} />
                    <span className="truncate">{p.label}</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                    {countByPriority[p.id]}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
