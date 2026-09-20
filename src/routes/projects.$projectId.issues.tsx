import { createFileRoute, useParams } from "@tanstack/react-router";
import { IssuesWorkbench } from "@/components/issues/IssuesWorkbench";

export const Route = createFileRoute("/projects/$projectId/issues")({
  component: IssuesRoute,
});

function IssuesRoute() {
  const { projectId } = useParams({ from: "/projects/$projectId/issues" });
  return <IssuesWorkbench projectId={projectId} />;
}

