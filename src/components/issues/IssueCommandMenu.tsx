import { useEffect } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Issue } from "@/types/issues";
import { Circle, AlertCircle, ArrowUpCircle, CheckCircle2, Clock, Plus, Search, Filter, Layers } from "lucide-react";

interface IssueCommandMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
  onCreateIssue: () => void;
  onSetFilterView: (view: "all" | "active" | "backlog" | "my_issues") => void;
  onToggleViewMode: () => void;
}

export function IssueCommandMenu({
  open,
  onOpenChange,
  issues,
  onSelectIssue,
  onCreateIssue,
  onSetFilterView,
  onToggleViewMode,
}: IssueCommandMenuProps) {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "c" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onCreateIssue();
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [open, onOpenChange, onCreateIssue]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Type a command or search issues..." />
      <CommandList className="max-h-[340px] text-xs">
        <CommandEmpty>No matching issues or commands.</CommandEmpty>
        
        <CommandGroup heading="Actions">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onCreateIssue();
            }}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          >
            <Plus className="size-3.5 text-zinc-400" />
            <span>Create new issue</span>
            <CommandShortcut className="text-[10px] text-zinc-500 font-mono">⌘C</CommandShortcut>
          </CommandItem>
          
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onToggleViewMode();
            }}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          >
            <Layers className="size-3.5 text-zinc-400" />
            <span>Switch view mode (List / Board)</span>
            <CommandShortcut className="text-[10px] text-zinc-500 font-mono">V</CommandShortcut>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="bg-zinc-800" />

        <CommandGroup heading="Views">
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onSetFilterView("active");
            }}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          >
            <Clock className="size-3.5 text-blue-400" />
            <span>Active Issues</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onSetFilterView("my_issues");
            }}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          >
            <Filter className="size-3.5 text-purple-400" />
            <span>Assigned to me</span>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              onOpenChange(false);
              onSetFilterView("backlog");
            }}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer"
          >
            <Circle className="size-3.5 text-zinc-500" />
            <span>Backlog</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator className="bg-zinc-800" />

        <CommandGroup heading="Recent Issues">
          {issues.slice(0, 8).map((issue) => (
            <CommandItem
              key={issue.id}
              onSelect={() => {
                onOpenChange(false);
                onSelectIssue(issue);
              }}
              className="flex items-center justify-between px-3 py-2 cursor-pointer"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[11px] text-zinc-500 shrink-0">{issue.id}</span>
                <span className="truncate text-zinc-200">{issue.title}</span>
              </div>
              <span className="text-[10px] uppercase font-semibold text-zinc-500 shrink-0 ml-2">
                {issue.status.replace("_", " ")}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
