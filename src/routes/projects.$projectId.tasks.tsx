import { createFileRoute, useParams } from "@tanstack/react-router";
import { IssuesWorkbench } from "@/components/issues/IssuesWorkbench";

export const Route = createFileRoute("/projects/$projectId/tasks")({
  component: TasksRoute,
});

function TasksRoute() {
  const { projectId } = useParams({ from: "/projects/$projectId/tasks" });
  return <IssuesWorkbench projectId={projectId} />;
}
