import { useState } from "react";
import { Issue, IssuePriority, IssueStatus, TeamMember } from "@/types/issues";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Tag, User } from "lucide-react";

interface CreateIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateIssue: (newIssue: Partial<Issue>) => void;
  teamMembers: TeamMember[];
  nextIssueNumber: number;
}

export function CreateIssueModal({
  open,
  onOpenChange,
  onCreateIssue,
  teamMembers,
  nextIssueNumber,
}: CreateIssueModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<IssueStatus>("todo");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [labelInput, setLabelInput] = useState("");
  const [labels, setLabels] = useState<string[]>(["frontend", "ui"]);

  const handleAddLabel = () => {
    if (labelInput.trim() && !labels.includes(labelInput.trim())) {
      setLabels([...labels, labelInput.trim()]);
      setLabelInput("");
    }
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setLabels(labels.filter((l) => l !== labelToRemove));
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error("Issue title is required");
      return;
    }

    const assignedMember = teamMembers.find((m) => m.id === assigneeId);

    onCreateIssue({
      id: `DEV-${nextIssueNumber}`,
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
      labels,
      assigned_to: assignedMember,
    });

    setTitle("");
    setDescription("");
    setStatus("todo");
    setPriority("medium");
    setAssigneeId("");
    onOpenChange(false);
    toast.success(`Created issue DEV-${nextIssueNumber}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#09090b] border-[#27272a] text-zinc-100 max-w-lg p-5 text-xs select-none">
        <DialogHeader>
          <DialogTitle className="text-sm font-semibold flex items-center justify-between text-zinc-200">
            <span>Create New Issue</span>
            <span className="font-mono text-xs text-zinc-500">DEV-{nextIssueNumber}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 my-2">
          <Input
            placeholder="Issue title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-[#18181b] border-[#27272a] text-zinc-100 text-xs focus-visible:ring-zinc-700"
            autoFocus
          />

          <Textarea
            placeholder="Add description (markdown supported)..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="bg-[#18181b] border-[#27272a] text-zinc-300 text-xs min-h-[90px] resize-none focus-visible:ring-zinc-700"
          />

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-zinc-500 font-semibold mb-1 block">Status</label>
              <Select value={status} onValueChange={(v) => v && setStatus(v as IssueStatus)}>
                <SelectTrigger className="bg-[#18181b] border-[#27272a] text-xs h-7">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#18181b] border-[#27272a] text-xs">
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[10px] text-zinc-500 font-semibold mb-1 block">Priority</label>
              <Select value={priority} onValueChange={(v) => v && setPriority(v as IssuePriority)}>
                <SelectTrigger className="bg-[#18181b] border-[#27272a] text-xs h-7">
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

            <div>
              <label className="text-[10px] text-zinc-500 font-semibold mb-1 block">Assignee</label>
              <Select value={assigneeId} onValueChange={(v) => setAssigneeId(v ?? "")}>
                <SelectTrigger className="bg-[#18181b] border-[#27272a] text-xs h-7">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent className="bg-[#18181b] border-[#27272a] text-xs">
                  <SelectItem value="">Unassigned</SelectItem>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="text-[10px] text-zinc-500 font-semibold mb-1 block">Labels</label>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Add label and press Enter..."
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddLabel())}
                className="bg-[#18181b] border-[#27272a] text-xs h-7 focus-visible:ring-zinc-700"
              />
              <Button
                onClick={handleAddLabel}
                type="button"
                variant="outline"
                className="h-7 text-xs border-[#27272a] bg-[#18181b] hover:bg-[#27272a]"
              >
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {labels.map((l) => (
                <Badge
                  key={l}
                  variant="outline"
                  onClick={() => handleRemoveLabel(l)}
                  className="cursor-pointer text-[10px] bg-[#18181b] border-[#27272a] text-zinc-300 hover:text-red-400 font-mono"
                >
                  {l} &times;
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#27272a] bg-[#18181b] hover:bg-[#27272a] text-xs h-8"
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-zinc-100 hover:bg-zinc-200 text-zinc-900 font-semibold text-xs h-8">
            Create Issue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
