"use client";

import { use, useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type TaskItem } from "@/lib/api";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { KanbanColumn } from "./kanban-column";
import { TaskCard } from "./task-card";
import { CreateTaskButton } from "./create-task-dialog";
import { ArrowLeft, Clock, Network } from "lucide-react";
import Link from "next/link";

const COLUMNS = [
  { id: "todo", title: "할 일", color: "border-t-blue-500" },
  { id: "in_progress", title: "진행 중", color: "border-t-yellow-500" },
  { id: "done", title: "완료", color: "border-t-green-500" },
  { id: "archived", title: "보관", color: "border-t-gray-500" },
];

interface KanbanBoardProps {
  paramsPromise: Promise<{ id: string }>;
}

export function KanbanBoard({ paramsPromise }: KanbanBoardProps) {
  const params = use(paramsPromise);
  const projectId = parseInt(params.id);
  const queryClient = useQueryClient();
  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);

  const { data: project } = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api.projects.get(projectId),
  });

  const { data: tasks = [] } = useQuery<TaskItem[]>({
    queryKey: ["tasks", projectId],
    queryFn: () => api.tasks.list(projectId),
  });

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: number; status: string }) =>
      api.tasks.updateStatus(taskId, status),
    onMutate: async ({ taskId, status }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", projectId] });
      const previous = queryClient.getQueryData(["tasks", projectId]);
      queryClient.setQueryData(["tasks", projectId], (old: TaskItem[]) =>
        old?.map((t) => (t.id === taskId ? { ...t, status } : t)) ?? []
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["tasks", projectId], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    },
  });

  const columnTasks = useMemo(() => {
    const grouped: Record<string, TaskItem[]> = {};
    for (const col of COLUMNS) {
      grouped[col.id] = tasks
        .filter((t) => t.status === col.id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return grouped;
  }, [tasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const activeTask = activeTaskId
    ? tasks.find((t) => t.id === activeTaskId)
    : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveTaskId(event.active.id as number);
  }

  function handleDragOver(_event: DragOverEvent) {
    // Visual feedback handled by column isOver state
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveTaskId(null);

    if (!over) return;

    const taskId = active.id as number;

    // Check if dropped on a column directly
    const overColumn = COLUMNS.find((c) => c.id === over.id);
    if (overColumn) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== overColumn.id) {
        statusMutation.mutate({ taskId, status: overColumn.id });
      }
      return;
    }

    // Dropped on another task -- find which column it belongs to
    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask) {
      const task = tasks.find((t) => t.id === taskId);
      if (task && task.status !== overTask.status) {
        statusMutation.mutate({ taskId, status: overTask.status });
      }
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          <span className="sr-only">대시보드로 돌아가기</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">
            {project?.name || "로딩 중..."}
          </h1>
          {project?.description && (
            <p className="text-sm text-muted-foreground">
              {project.description}
            </p>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href={`/projects/${projectId}/timeline`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
          >
            <Clock className="w-4 h-4" />
            타임라인
          </Link>
          <Link
            href={`/projects/${projectId}/flow`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-card border border-border rounded-md hover:bg-accent transition-colors"
          >
            <Network className="w-4 h-4" />
            플로우
          </Link>
          <CreateTaskButton projectId={projectId} />
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={handleDragOver}
      >
        <div className="grid grid-cols-4 gap-4 min-h-[calc(100vh-12rem)]">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              title={col.title}
              color={col.color}
              count={columnTasks[col.id]?.length ?? 0}
            >
              <SortableContext
                items={columnTasks[col.id]?.map((t) => t.id) ?? []}
                strategy={verticalListSortingStrategy}
              >
                {columnTasks[col.id]?.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </SortableContext>
            </KanbanColumn>
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragOverlay /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
