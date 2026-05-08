import { createFileRoute, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useProject } from "@/lib/use-project";
import { getSupabase } from "@/integrations/supabase/client";
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
import { emitSync, useSyncListener } from "@/lib/sync";

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
  created_by_avatar?: string;
  due_date?: string;
  created_at: string;
}

interface TeamMember {
  linked_user_id: string | null;
  github_login: string;
  name: string | null;
  avatar_url: string | null;
}

export const Route = createFileRoute("/projects/$projectId/tasks")({
  component: Tasks,
});

function Tasks() {
  const { projectId } = useParams({ from: "/projects/$projectId/tasks" });
  const { project } = useProject(projectId);
  const { user } = useAuth();
  const currentUserMeta = (user?.user_metadata as Record<string, string> | undefined) ?? {};
  const currentUserGithubLogin =
    currentUserMeta.user_name || currentUserMeta.preferred_username || user?.email || "";
  const currentUserAvatar = currentUserMeta.avatar_url || undefined;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
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

  // Load tasks and org members
  useEffect(() => {
    if (!project) {
      setTasks([]);
      setTeamMembers([]);
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const supabase = getSupabase();

        // Fetch tasks
        const { data: taskRows, error: taskError } = await supabase
          .from("tasks")
          .select(
            "id, title, description, status, priority, assigned_to, created_by, due_date, created_at",
          )
          .eq("project_id", project.id)
          .order("created_at", { ascending: false });

        if (!mounted) return;
        if (taskError) {
          console.error("Failed to load tasks:", taskError);
        }

        // If project has org_id, fetch org members; otherwise infer the org from repo owner and fall back to project team members
        let assignableMembers: TeamMember[] = [];
        let projectOrgId = project.org_id;
        if (!projectOrgId && project.owner) {
          const ownerKey = project.owner.toLowerCase();
          const { data: matchingOrgs, error: matchingOrgsError } = await supabase
            .from("organizations")
            .select("id")
            .or(`github_org_login.ilike.${ownerKey},slug.ilike.${ownerKey}`)
            .limit(1);
          if (!matchingOrgsError && matchingOrgs?.length > 0) {
            projectOrgId = matchingOrgs[0].id;
          }
        }

        if (projectOrgId) {
          const { data: orgMembers, error: orgError } = await supabase
            .from("org_members")
            .select("user_id, display_name, github_login, avatar_url")
            .eq("org_id", projectOrgId)
            .eq("status", "accepted");

          if (orgError) {
            console.error("Failed to load org members:", orgError);
          } else {
            assignableMembers = (orgMembers || []).map((row: any) => ({
              linked_user_id: row.user_id,
              github_login:
                (row.user_id === user?.id ? currentUserGithubLogin : null) ||
                row.github_login ||
                row.display_name ||
                row.user_id.slice(0, 8),
              name:
                (row.user_id === user?.id ? currentUserGithubLogin : null) ||
                row.display_name ||
                row.github_login ||
                null,
              avatar_url:
                (row.user_id === user?.id ? currentUserAvatar : null) || row.avatar_url || null,
            })) as TeamMember[];
          }
        } else {
          const { data: memberRows, error: memberError } = await supabase
            .from("project_team_members")
            .select("linked_user_id, github_login, name, avatar_url")
            .eq("project_id", project.id)
            .not("linked_user_id", "is", null)
            .order("name", { ascending: true });

          if (memberError) {
            console.error("Failed to load project team members:", memberError);
          } else {
            assignableMembers = (memberRows || []).map((row: any) => ({
              linked_user_id: row.linked_user_id,
              github_login: row.github_login,
              name: row.name,
              avatar_url: row.avatar_url,
            })) as TeamMember[];
          }
        }

        const currentUserLabel = currentUserGithubLogin || "Unknown";

        const memberByUserId = new Map(
          assignableMembers
            .filter((member) => Boolean(member.linked_user_id))
            .map((member) => [member.linked_user_id as string, member] as const),
        );

        const loadedTasks = (taskRows || []).map((row: any) => {
          const assignedMember = row.assigned_to ? memberByUserId.get(row.assigned_to) : null;
          const createdByCurrentUser = row.created_by === user?.id;

          return {
            id: row.id,
            title: row.title,
            description: row.description || undefined,
            status: (row.status || "todo") as Task["status"],
            priority: (row.priority || "medium") as Task["priority"],
            assigned_to_id: row.assigned_to || undefined,
            assigned_to_name: assignedMember?.name || assignedMember?.github_login || undefined,
            assigned_to_avatar: assignedMember?.avatar_url || undefined,
            created_by_id: row.created_by,
            created_by_name: createdByCurrentUser ? currentUserLabel : "Unknown",
            created_by_avatar: createdByCurrentUser ? currentUserAvatar : undefined,
            due_date: row.due_date || undefined,
            created_at: row.created_at,
          } as Task;
        });

        setTeamMembers(assignableMembers);
        setTasks(loadedTasks);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [project, tick]);

  const handleCreate = async () => {
    if (!newTask.title.trim() || !user || !project) {
      toast.error("Title is required");
      return;
    }

    const assignableMembers = teamMembers.filter((member) => Boolean(member.linked_user_id));
    if (assignableMembers.length > 0 && !newTask.assigned_to_id) {
      toast.error("Select a team member to assign the task");
      return;
    }

    setCreating(true);
    try {
      const supabase = getSupabase();
      const { data, error } = await supabase
        .from("tasks")
        .insert({
          project_id: project?.id,
          created_by: user.id,
          assigned_to: newTask.assigned_to_id || null,
          title: newTask.title.trim(),
          description: newTask.description.trim() || null,
          status: "todo",
          priority: newTask.priority,
          due_date: newTask.due_date || null,
        })
        .select(
          "id, title, description, status, priority, assigned_to, created_by, due_date, created_at",
        )
        .single();

      if (error) throw error;

      const memberByUserId = new Map(
        teamMembers
          .filter((member) => Boolean(member.linked_user_id))
          .map((member) => [member.linked_user_id as string, member] as const),
      );
      const assignedMember = data.assigned_to ? memberByUserId.get(data.assigned_to) : null;
      const currentUserLabel = (user.user_metadata as any)?.user_name || user.email || "Unknown";
      const currentUserAvatar = (user.user_metadata as any)?.avatar_url || undefined;

      const task: Task = {
        id: data.id,
        title: data.title,
        description: data.description || undefined,
        status: (data.status || "todo") as Task["status"],
        priority: (data.priority || "medium") as Task["priority"],
        assigned_to_id: data.assigned_to || undefined,
        assigned_to_name: assignedMember?.name || assignedMember?.github_login || undefined,
        assigned_to_avatar: assignedMember?.avatar_url || undefined,
        created_by_id: data.created_by,
        created_by_name: currentUserLabel,
        created_by_avatar: currentUserAvatar,
        due_date: data.due_date || undefined,
        created_at: data.created_at,
      };

      setTasks((prev) => [task, ...prev]);
      setNewTask({
        title: "",
        description: "",
        priority: "medium",
        assigned_to_id: "",
        due_date: "",
      });
      emitSync(project?.id);
      toast.success("Task created");
    } catch (err) {
      console.error("Failed to create task:", err);
      toast.error("Failed to create task");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: Task["status"]) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("tasks").update({ status: newStatus }).eq("id", taskId);
      if (error) throw error;
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      emitSync(project?.id);
    } catch (err) {
      console.error("Failed to update task status:", err);
      toast.error("Failed to update task");
    }
  };

  const handleDelete = async (taskId: string) => {
    try {
      const supabase = getSupabase();
      const { error } = await supabase.from("tasks").delete().eq("id", taskId);
      if (error) throw error;
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      emitSync(project?.id);
      toast.success("Task deleted");
    } catch (err) {
      console.error("Failed to delete task:", err);
      toast.error("Failed to delete task");
    }
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select
              value={newTask.assigned_to_id}
              onValueChange={(v) =>
                setNewTask((p) => ({
                  ...p,
                  assigned_to_id: v,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Assign to team member" />
              </SelectTrigger>
              <SelectContent>
                {teamMembers.filter((member) => member.linked_user_id).length === 0 ? (
                  <SelectItem value="__none" disabled>
                    No linked team members
                  </SelectItem>
                ) : (
                  teamMembers
                    .filter((member) => member.linked_user_id)
                    .map((member) => (
                      <SelectItem
                        key={member.linked_user_id}
                        value={member.linked_user_id as string}
                        className="py-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Avatar className="size-5 shrink-0">
                            <AvatarImage src={member.avatar_url ?? undefined} />
                            <AvatarFallback className="text-[10px]">
                              {(member.name || member.github_login || "?")
                                .slice(0, 1)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="truncate text-sm">
                              {member.name || member.github_login}
                            </div>
                            <div className="truncate text-[10px] text-muted-foreground">
                              @{member.github_login}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                )}
              </SelectContent>
            </Select>
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
          <p className="text-[10px] text-muted-foreground">
            Assigning to a linked team member makes the task visible to the rest of the project
            team.
          </p>
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
                        <h4 className="text-xs font-semibold flex-1 line-clamp-2">{task.title}</h4>
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
                        <Badge
                          variant="outline"
                          className={`text-[9px] ${priorityColor[task.priority]}`}
                        >
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
