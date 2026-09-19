import { Issue, IssuePriority, IssueStatus } from "@/types/issues";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Circle, Clock, CheckCircle2, AlertTriangle, Flame, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface IssueBoardProps {
  issues: Issue[];
  selectedIssueId?: string;
  onSelectIssue: (issue: Issue) => void;
  onUpdateStatus: (issueId: string, status: IssueStatus) => void;
  onCreateIssue: () => void;
}

const columns: { id: IssueStatus; label: string; icon: any; color: string }[] = [
  { id: "backlog", label: "Backlog", icon: Circle, color: "text-zinc-500" },
  { id: "todo", label: "To Do", icon: Circle, color: "text-zinc-400" },
  { id: "in_progress", label: "In Progress", icon: Clock, color: "text-amber-400" },
  { id: "in_review", label: "In Review", icon: Clock, color: "text-purple-400" },
  { id: "done", label: "Done", icon: CheckCircle2, color: "text-emerald-400" },
];

const priorityColor: Record<IssuePriority, string> = {
  urgent: "text-red-400 border-red-950/40 bg-red-950/20",
  high: "text-amber-400 border-amber-950/40 bg-amber-950/20",
  medium: "text-blue-400 border-blue-950/40 bg-blue-950/20",
  low: "text-zinc-400 border-zinc-800 bg-zinc-900/40",
  no_priority: "text-zinc-500 border-zinc-900 bg-zinc-950",
};

export function IssueBoard({
  issues,
  selectedIssueId,
  onSelectIssue,
  onUpdateStatus,
  onCreateIssue,
}: IssueBoardProps) {
  return (
    <div className="flex-1 overflow-x-auto p-4 scrollbar-thin bg-[#09090b]">
      <div className="flex gap-3 min-h-full items-start">
        {columns.map((col) => {
          const colIssues = issues.filter((i) => i.status === col.id);
          const ColIcon = col.icon;

          return (
            <div
              key={col.id}
              className="w-72 shrink-0 bg-[#09090b] border border-[#27272a] rounded-lg p-2 flex flex-col max-h-[calc(100vh-140px)]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#27272a] mb-2">
                <div className="flex items-center gap-2">
                  <ColIcon className={cn("size-3.5", col.color)} />
                  <span className="text-xs font-semibold text-zinc-300">{col.label}</span>
                  <span className="text-[10px] font-mono text-zinc-500">
                    {colIssues.length}
                  </span>
                </div>
                <button
                  onClick={onCreateIssue}
                  className="p-1 text-zinc-500 hover:text-zinc-200 hover:bg-[#18181b] rounded transition-colors"
                >
                  <Plus className="size-3.5" />
                </button>
              </div>

              {/* Column Cards */}
              <div className="flex-1 overflow-y-auto space-y-2 p-0.5 scrollbar-thin">
                {colIssues.length === 0 ? (
                  <div className="text-[11px] text-zinc-600 text-center py-8 border border-dashed border-[#27272a]/60 rounded-md">
                    No issues
                  </div>
                ) : (
                  colIssues.map((issue) => {
                    const isSelected = issue.id === selectedIssueId;

                    return (
                      <div
                        key={issue.id}
                        onClick={() => onSelectIssue(issue)}
                        className={cn(
                          "bg-[#18181b] border border-[#27272a] hover:border-zinc-500/50 rounded-md p-2.5 cursor-pointer transition-all space-y-2 select-none",
                          isSelected && "ring-1 ring-zinc-400 border-zinc-400"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-zinc-500">
                            {issue.id}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[9px] uppercase px-1 py-0 h-4 font-semibold",
                              priorityColor[issue.priority]
                            )}
                          >
                            {issue.priority}
                          </Badge>
                        </div>

                        <p className="text-xs font-medium text-zinc-200 line-clamp-2 leading-snug">
                          {issue.title}
                        </p>

                        {issue.labels.length > 0 && (
                          <div className="flex items-center gap-1 flex-wrap">
                            {issue.labels.map((label) => (
                              <span
                                key={label}
                                className="text-[9px] font-mono px-1 py-0.5 bg-[#09090b] border border-[#27272a] rounded text-zinc-400"
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-[#27272a]/60 text-[10px] text-zinc-500">
                          {issue.assigned_to ? (
                            <div className="flex items-center gap-1">
                              <Avatar className="size-3.5">
                                <AvatarImage src={issue.assigned_to.avatar_url} />
                                <AvatarFallback className="text-[7px]">
                                  {issue.assigned_to.name[0]?.toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate max-w-[100px] text-zinc-400">
                                {issue.assigned_to.name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-zinc-600">Unassigned</span>
                          )}

                          <span>
                            {new Date(issue.created_at).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
