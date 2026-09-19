import { Issue, IssuePriority, IssueStatus } from "@/types/issues";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Circle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  User,
  SlidersHorizontal,
  Calendar,
  Copy,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface IssueTableProps {
  issues: Issue[];
  selectedIssueId?: string;
  onSelectIssue: (issue: Issue) => void;
  onUpdateStatus: (issueId: string, status: IssueStatus) => void;
  onUpdatePriority: (issueId: string, priority: IssuePriority) => void;
  onDuplicateIssue: (issue: Issue) => void;
  onDeleteIssue: (issueId: string) => void;
}

const statusConfig: Record<IssueStatus, { label: string; icon: any; color: string }> = {
  backlog: { label: "Backlog", icon: Circle, color: "text-zinc-500" },
  todo: { label: "To Do", icon: Circle, color: "text-zinc-400" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-amber-400" },
  in_review: { label: "In Review", icon: SlidersHorizontal, color: "text-purple-400" },
  done: { label: "Done", icon: CheckCircle2, color: "text-emerald-400" },
  canceled: { label: "Canceled", icon: Circle, color: "text-zinc-600" },
};

const priorityConfig: Record<IssuePriority, { label: string; icon: any; color: string }> = {
  urgent: { label: "Urgent", icon: Flame, color: "text-red-400" },
  high: { label: "High", icon: AlertTriangle, color: "text-amber-400" },
  medium: { label: "Medium", icon: Clock, color: "text-blue-400" },
  low: { label: "Low", icon: Circle, color: "text-zinc-400" },
  no_priority: { label: "No Priority", icon: Circle, color: "text-zinc-600" },
};

export function IssueTable({
  issues,
  selectedIssueId,
  onSelectIssue,
  onUpdateStatus,
  onUpdatePriority,
  onDuplicateIssue,
  onDeleteIssue,
}: IssueTableProps) {
  if (issues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500 border border-dashed border-[#27272a] rounded-lg m-4">
        <Circle className="size-8 stroke-[1.5] mb-2 text-zinc-600" />
        <h4 className="text-xs font-semibold text-zinc-300">No matching issues</h4>
        <p className="text-[11px] text-zinc-500 mt-0.5">Try clearing filters or creating a new issue.</p>
      </div>
    );
  }

  return (
    <div className="w-full border-t border-[#27272a] bg-[#09090b] divide-y divide-[#27272a] text-xs">
      {issues.map((issue) => {
        const isSelected = issue.id === selectedIssueId;
        const statusInfo = statusConfig[issue.status] || statusConfig.todo;
        const priorityInfo = priorityConfig[issue.priority] || priorityConfig.no_priority;
        const StatusIcon = statusInfo.icon;
        const PriorityIcon = priorityInfo.icon;

        return (
          <div
            key={issue.id}
            onClick={() => onSelectIssue(issue)}
            className={cn(
              "group flex items-center justify-between px-3 py-2 cursor-pointer transition-colors select-none",
              isSelected
                ? "bg-[#18181b] border-l-2 border-l-zinc-100"
                : "hover:bg-[#18181b]/50"
            )}
          >
            {/* Left section: Priority, ID, Status, Title */}
            <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-4">
              {/* Priority Picker Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded hover:bg-[#27272a] text-zinc-400 transition-colors"
                  title={`Priority: ${priorityInfo.label}`}
                >
                  <PriorityIcon className={cn("size-3.5", priorityInfo.color)} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-[#18181b] border-[#27272a] text-xs">
                  {Object.entries(priorityConfig).map(([key, val]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdatePriority(issue.id, key as IssuePriority);
                      }}
                      className="flex items-center gap-2 text-zinc-300 hover:text-zinc-100 focus:bg-[#27272a] cursor-pointer text-xs"
                    >
                      <val.icon className={cn("size-3.5", val.color)} />
                      <span>{val.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Issue ID */}
              <span className="font-mono text-[11px] text-zinc-400 shrink-0 w-16">
                {issue.id}
              </span>

              {/* Status Picker Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5 px-1.5 py-0.5 rounded hover:bg-[#27272a] text-zinc-400 shrink-0 transition-colors"
                >
                  <StatusIcon className={cn("size-3.5", statusInfo.color)} />
                  <span className="text-[11px] font-medium capitalize text-zinc-300">
                    {statusInfo.label}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-[#18181b] border-[#27272a] text-xs">
                  {Object.entries(statusConfig).map(([key, val]) => (
                    <DropdownMenuItem
                      key={key}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateStatus(issue.id, key as IssueStatus);
                      }}
                      className="flex items-center gap-2 text-zinc-300 hover:text-zinc-100 focus:bg-[#27272a] cursor-pointer text-xs"
                    >
                      <val.icon className={cn("size-3.5", val.color)} />
                      <span>{val.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Issue Title */}
              <span className="font-medium text-zinc-200 truncate group-hover:text-zinc-100">
                {issue.title}
              </span>

              {/* Labels */}
              {issue.labels.length > 0 && (
                <div className="hidden md:flex items-center gap-1 shrink-0">
                  {issue.labels.slice(0, 3).map((label) => (
                    <Badge
                      key={label}
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 border-[#27272a] text-zinc-400 font-mono"
                    >
                      {label}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Right section: Assignee, Date, Quick Actions */}
            <div className="flex items-center gap-3 shrink-0 text-zinc-500">
              {issue.assigned_to ? (
                <div className="flex items-center gap-1.5" title={`Assigned to ${issue.assigned_to.name}`}>
                  <Avatar className="size-4 shrink-0">
                    <AvatarImage src={issue.assigned_to.avatar_url} />
                    <AvatarFallback className="text-[8px] bg-[#27272a] text-zinc-300">
                      {issue.assigned_to.name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-[11px] text-zinc-400 truncate max-w-[90px]">
                    {issue.assigned_to.name}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[11px] text-zinc-600">
                  <User className="size-3" />
                  <span className="hidden sm:inline">Unassigned</span>
                </div>
              )}

              <div className="hidden lg:flex items-center gap-1 text-[10px] text-zinc-500 font-mono w-20 justify-end">
                <Calendar className="size-3" />
                <span>{new Date(issue.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
              </div>

              {/* Row Action Menu (Duplicate / Delete) */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  onClick={(e) => e.stopPropagation()}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[#27272a] text-zinc-400 transition-opacity"
                >
                  <MoreHorizontal className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#18181b] border-[#27272a] text-xs">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateIssue(issue);
                    }}
                    className="flex items-center gap-2 text-zinc-300 hover:text-zinc-100 focus:bg-[#27272a] cursor-pointer text-xs"
                  >
                    <Copy className="size-3.5 text-zinc-400" />
                    <span>Duplicate Issue</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-[#27272a]" />
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteIssue(issue.id);
                    }}
                    className="flex items-center gap-2 text-red-400 hover:text-red-300 focus:bg-[#27272a] cursor-pointer text-xs"
                  >
                    <Trash2 className="size-3.5 text-red-400" />
                    <span>Delete Issue</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        );
      })}
    </div>
  );
}
