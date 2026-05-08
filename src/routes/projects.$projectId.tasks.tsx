import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useProject } from "@/lib/use-project";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2, CheckCircle2, Clock, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useSyncListener } from "@/lib/sync";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "in_review" | "done";
  priority: "low" | "medium" | "high" | "critical";
  assigned_to_id?: string;
  assigned_to_name?: string;
  assigned_to_avatar?: string;
  created_by_id: string;
  created_by_name: string;
  due_date?: string;
  created_at: string;
}

export const Route = createFileRoute("/projects/$projectId/tasks")({
  component: Tasks,
});

function Tasks() {
  const { projectId } = useParams({ from: "/projects/$projectId/tasks" });
  const { project } = useProject(projectId);
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "medium" as const,
    assigned_to_id: "",
    due_date: "",
  });
  const [tick, setTick] = useState(0);
  useSyncListener(() => setTick((n) => n + 1));

  // Load tasks
  useEffect(() => {
    if (!project) return;
    setLoading(true);
    // TODO: Fetch tasks from Supabase
    setTimeout(() => {
      setTasks([]);
      setLoading(false);
    }, 500);
  }, [project, tick]);

  const handleCreate = async () => {
    if (!newTask.title.trim() || !user) {
      toast.error("Title is required");
      return;
    }

    setCreating(true);
    try {
      // TODO: Create task in Supabase
      const task: Task = {
        id: Date.now().toString(),
        title: newTask.title,
        description: newTask.description || undefined,
        status: "todo",
        priority: newTask.priority,
        assigned_to_id: newTask.assigned_to_id || undefined,
        created_by_id: user.id,
        created_by_name: (user.user_metadata as any)?.user_name || user.email || "Unknown",
        due_date: newTask.due_date || undefined,
        created_at: new Date().toISOString(),
      };

      setTasks((prev) => [task, ...prev]);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        assigned_to_id: "",
        due_date: "",
      });
      toast.success("Task created");
    } catch (err) {
      console.error("Failed to create task:", err);
      toast.error("Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task["status"]) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    // TODO: Update in Supabase
  };

  const handleDelete = async (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    // TODO: Delete from Supabase
    toast.success("Task deleted");
  };

  const grouped = {
    todo: tasks.filter((t) => t.status === "todo"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    in_review: tasks.filter((t) => t.status === "in_review"),
    done: tasks.filter((t) => t.status === "done"),
  };

  const priorityColor = {
    low: "bg-success/10 text-success border-success/20",
    medium: "bg-primary/10 text-primary border-primary/20",
    high: "bg-warning/10 text-warning border-warning/20",
    critical: "bg-danger/10 text-danger border-danger/20",
  };

  const statusIcon = {
    todo: <AlertCircle className="size-4" />,
    in_progress: <Loader2 className="size-4 animate-spin" />,
    in_review: <Clock className="size-4" />,
    done: <CheckCircle2 className="size-4" />,
  };

  return (
    <>
      <h1 className="text-2xl font-display font-bold mb-4">Task Management</h1>

      {/* Create new task */}
      <div className="glass rounded-xl p-5 mb-6">
        <h3 className="font-semibold text-sm mb-3">Create New Task</h3>
        <div className="space-y-3">
          <Input
            placeholder="Task title"
            value={newTask.title}
            onChange={(e) => setNewTask((p) => ({ ...p, title: e.target.value }))}
          />
          <Textarea
            placeholder="Description (optional)"
            value={newTask.description}
            onChange={(e) => setNewTask((p) => ({ ...p, description: e.target.value }))}
            className="min-h-20"
          />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select
              value={newTask.priority}
              onValueChange={(v) =>
                setNewTask((p) => ({
                  ...p,
                  priority: v as Task["priority"],
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={newTask.due_date}
              onChange={(e) => setNewTask((p) => ({ ...p, due_date: e.target.value }))}
              placeholder="Due date"
            />
            <Button onClick={handleCreate} disabled={creating || !newTask.title.trim()}>
              {creating ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  <Plus className="size-4 mr-2" />
                  Create Task
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Task columns */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin mr-2" />
          Loading tasks…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(
            [
              { key: "todo", label: "To Do", count: grouped.todo.length },
              { key: "in_progress", label: "In Progress", count: grouped.in_progress.length },
              { key: "in_review", label: "In Review", count: grouped.in_review.length },
              { key: "done", label: "Done", count: grouped.done.length },
            ] as const
          ).map((col) => (
            <div key={col.key} className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-sm">{col.label}</h3>
                <Badge variant="secondary" className="text-xs">
                  {col.count}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[200px]">
                {grouped[col.key].length === 0 ? (
                  <div className="text-xs text-muted-foreground p-2">No tasks</div>
                ) : (
                  grouped[col.key].map((task) => (
                    <div
                      key={task.id}
                      className="bg-surface rounded-lg p-3 border border-border hover:border-border-strong transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="text-xs font-semibold flex-1 line-clamp-2">
                          {task.title}
                        </h4>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <button className="text-muted-foreground hover:text-danger shrink-0">
                              <Trash2 className="size-3" />
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogTitle>Delete Task</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{task.title}"? This action cannot be
                              undone.
                            </AlertDialogDescription>
                            <div className="flex gap-3 justify-end">
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(task.id)}
                                className="bg-danger hover:bg-danger/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </div>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>

                      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                        <Badge variant="outline" className={`text-[9px] ${priorityColor[task.priority]}`}>
                          {task.priority}
                        </Badge>
                        {task.assigned_to_name && (
                          <div className="flex items-center gap-1">
                            <Avatar className="size-4">
                              <AvatarImage src={task.assigned_to_avatar} />
                              <AvatarFallback className="text-[8px]">
                                {task.assigned_to_name[0]?.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-[9px] text-muted-foreground">
                              {task.assigned_to_name}
                            </span>
                          </div>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">
                          {task.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          {statusIcon[task.status]}
                          <span className="text-[9px]">{task.status.replace(/_/g, " ")}</span>
                        </div>
                        <Select
                          value={task.status}
                          onValueChange={(v) => handleStatusChange(task.id, v as Task["status"])}
                        >
                          <SelectTrigger className="h-6 w-24 text-[9px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todo">To Do</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="in_review">In Review</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {task.due_date && (
                        <div className="text-[9px] text-muted-foreground mt-2">
                          Due: {new Date(task.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
