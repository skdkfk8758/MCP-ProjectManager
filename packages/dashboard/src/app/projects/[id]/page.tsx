import { KanbanBoard } from "@/components/kanban/kanban-board";

export default function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <KanbanBoard paramsPromise={params} />;
}
