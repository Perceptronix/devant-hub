import { useState } from "react";
import { Issue, IssuePriority, IssueStatus, TeamMember } from "@/types/issues";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Trash2,
  CheckCircle2,
  Clock,
  Circle,
  AlertTriangle,
  Flame,
  User,
  Tag,
  Calendar,
  Send,
  MessageSquare,
  Copy,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface IssueDrawerProps {
  issue: Issue | null;
  onClose: () => void;
  onUpdateIssue: (updated: Issue) => void;
  onDeleteIssue: (issueId: string) => void;
  onDuplicateIssue: (issue: Issue) => void;
  teamMembers: TeamMember[];
}

export function IssueDrawer({
  issue,
  onClose,
  onUpdateIssue,
  onDeleteIssue,
  onDuplicateIssue,
  teamMembers,
}: IssueDrawerProps) {
  if (!issue) return null;

  const [commentText, setCommentText] = useState("");

  const handleStatusChange = (status: IssueStatus) => {
    onUpdateIssue({
      ...issue,
      status,
      updated_at: new Date().toISOString(),
      activities: [
        {
          id: String(Date.now()),
          issue_id: issue.id,
          user_name: "You",
          action: `changed status to ${status.replace("_", " ")}`,
          timestamp: "Just now",
        },
        ...(issue.activities || []),
      ],
    });
    toast.success(`Status updated to ${status.replace("_", " ")}`);
  };

  const handlePriorityChange = (priority: IssuePriority) => {
    onUpdateIssue({
      ...issue,
      priority,
      updated_at: new Date().toISOString(),
    });
    toast.success(`Priority updated to ${priority}`);
  };

  const handleAssigneeChange = (memberId: string) => {
    const member = teamMembers.find((m) => m.id === memberId);
    onUpdateIssue({
      ...issue,
      assigned_to: member,
      updated_at: new Date().toISOString(),
    });
    toast.success(member ? `Assigned to ${member.name}` : "Unassigned issue");
  };

  const handleAddComment = () => {
    if (!commentText.trim()) return;
    const newActivity = {
      id: String(Date.now()),
      issue_id: issue.id,
      user_name: "You",
      action: `commented: "${commentText.trim()}"`,
      timestamp: "Just now",
    };
    onUpdateIssue({
      ...issue,
      activities: [newActivity, ...(issue.activities || [])],
    });
    setCommentText("");
    toast.success("Comment posted");
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(issue.id);
    toast.success(`Copied ${issue.id} to clipboard`);
  };

  return (
    <div className="w-[320px] shrink-0 border-l border-[#27272a] bg-[#09090b] flex flex-col h-full text-xs select-none">
      {/* Header */}
      <div className="h-10 px-3 border-b border-[#27272a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyId}
            className="font-mono text-xs text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors"
            title="Copy Issue ID"
          >
            <span>{issue.id}</span>
            <Copy className="size-3 text-zinc-500" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicateIssue(issue)}
            className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-[#18181b] transition-colors"
            title="Duplicate Issue"
          >
            <Copy className="size-3.5" />
          </button>
          <button
            onClick={() => onDeleteIssue(issue.id)}
            className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-[#18181b] transition-colors"
            title="Delete Issue"
          >
            <Trash2 className="size-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-[#18181b] transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
        {/* Title & Description */}
        <div className="space-y-2">
          <Input
            value={issue.title}
            onChange={(e) => onUpdateIssue({ ...issue, title: e.target.value })}
            className="bg-transparent border-none p-0 text-sm font-semibold text-zinc-100 focus-visible:ring-0 focus-visible:border-b focus-visible:border-zinc-500 rounded-none"
            placeholder="Issue title"
          />
          <Textarea
            value={issue.description || ""}
            onChange={(e) => onUpdateIssue({ ...issue, description: e.target.value })}
            placeholder="Add description..."
            className="bg-[#18181b] border-[#27272a] text-zinc-300 text-xs min-h-[70px] resize-none focus-visible:ring-zinc-700"
          />
        </div>

        {/* Properties Meta Table */}
        <div className="space-y-3 bg-[#18181b] p-3 rounded-lg border border-[#27272a]">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-[11px]">Status</span>
            <Select value={issue.status} onValueChange={(val) => val && handleStatusChange(val as IssueStatus)}>
              <SelectTrigger className="h-6 w-32 bg-[#09090b] border-[#27272a] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-[#27272a] text-xs">
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-[11px]">Priority</span>
            <Select value={issue.priority} onValueChange={(val) => val && handlePriorityChange(val as IssuePriority)}>
              <SelectTrigger className="h-6 w-32 bg-[#09090b] border-[#27272a] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-[#27272a] text-xs">
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="no_priority">No Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Assignee */}
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 text-[11px]">Assignee</span>
            <Select
              value={issue.assigned_to?.id || "unassigned"}
              onValueChange={(val) => handleAssigneeChange(!val || val === "unassigned" ? "" : val)}
            >
              <SelectTrigger className="h-6 w-32 bg-[#09090b] border-[#27272a] text-xs">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent className="bg-[#18181b] border-[#27272a] text-xs">
                <SelectItem value="unassigned">Unassigned</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Created Date */}
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <span>Created</span>
            <span className="font-mono text-zinc-300">
              {new Date(issue.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Labels Section */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-zinc-400 text-[11px] font-semibold">
            <span>Labels</span>
            <Tag className="size-3" />
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            {issue.labels.map((label) => (
              <Badge
                key={label}
                variant="outline"
                className="text-[10px] bg-[#18181b] border-[#27272a] text-zinc-300 px-2 py-0.5"
              >
                {label}
              </Badge>
            ))}
          </div>
        </div>

        {/* Activity & Comments Timeline */}
        <div className="space-y-3 pt-2 border-t border-[#27272a]">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-tight flex items-center gap-1.5">
            <MessageSquare className="size-3" />
            Activity
          </span>

          {/* Comment Input */}
          <div className="flex items-center gap-2">
            <Input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Leave a comment..."
              onKeyDown={(e) => e.key === "Enter" && handleAddComment()}
              className="h-7 bg-[#18181b] border-[#27272a] text-xs text-zinc-200 placeholder:text-zinc-600"
            />
            <Button
              onClick={handleAddComment}
              disabled={!commentText.trim()}
              size="icon"
              className="size-7 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 shrink-0"
            >
              <Send className="size-3" />
            </Button>
          </div>

          {/* Timeline items */}
          <div className="space-y-2 max-h-[180px] overflow-y-auto scrollbar-thin">
            {(issue.activities || []).map((act) => (
              <div key={act.id} className="flex items-start gap-2 text-[11px] text-zinc-400 bg-[#18181b]/40 p-2 rounded border border-[#27272a]/50">
                <Avatar className="size-4 shrink-0 mt-0.5">
                  <AvatarImage src={act.user_avatar} />
                  <AvatarFallback className="text-[8px] bg-zinc-800 text-zinc-300">
                    {act.user_name[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-zinc-200">{act.user_name} </span>
                  <span className="text-zinc-400">{act.action}</span>
                  <div className="text-[9px] text-zinc-600 font-mono mt-0.5">{act.timestamp}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
