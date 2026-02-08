"use client";

import { use, useState, useMemo, useCallback } from "react";
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
import { TaskFormDialog } from "./task-form-dialog";
import { Dialog } from "@/components/ui/dialog";
import { useWebSocket } from "@/hooks/use-websocket";
import { ArrowLeft, Clock, Network } from "lucide-react";
import Link from "next/link";

const COLUMNS = [
  { id: "todo", title: "할 일", color: "border-t-blue-500", status: "todo", phase: null },
  { id: "design", title: "설계", color: "border-t-violet-500", status: "in_progress", phase: "design" },
  { id: "implementation", title: "구현", color: "border-t-cyan-500", status: "in_progress", phase: "implementation" },
  { id: "review", title: "리뷰", color: "border-t-amber-500", status: "in_progress", phase: "review" },
  { id: "testing", title: "테스트", color: "border-t-teal-500", status: "in_progress", phase: "testing" },
  { id: "done", title: "완료", color: "border-t-green-500", status: "done", phase: null },
  { id: "archived", title: "보관", color: "border-t-gray-500", status: "archived", phase: null },
] as const;

function getColumnId(task: TaskItem): string {
  if (task.status === "in_progress" && task.phase) {
    const col = COLUMNS.find((c) => c.phase === task.phase);
    if (col) return col.id;
    return "implementation";
  }
  if (task.status === "in_progress") return "implementation";
  const col = COLUMNS.find((c) => c.id === task.status);
  return col ? col.id : "todo";
}

interface KanbanBoardProps {
  paramsPromise: Promise<{ id: string }>;
}

export function KanbanBoard({ paramsPromise }: KanbanBoardProps) {
  const params = use(paramsPromise);
  const projectId = parseInt(params.id);
  const queryClient = useQueryClient();

  const [activeTaskId, setActiveTaskId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [deletingTask, setDeletingTask] = useState<TaskItem | null>(null);
  const [dashboardSession, setDashboardSession] = useState<string | null>(null);
  const [activeExecutions, setActiveExecutions] = useState<Set<number>>(new Set());

  const { data: project } = useQuery({
    queryKey: ["projects", projectId],
    queryFn: () => api.projects.get(projectId),
  });

  const { data: tasks = [] } = useQuery<TaskItem[]>({
    queryKey: ["tasks", projectId],
    queryFn: () => api.tasks.list(projectId),
  });

  // WebSocket for real-time updates
  useWebSocket(["task_execution", "task"], useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
  }, [queryClient, projectId]));

  // Update mutation: status + phase
  const updateMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: number; data: Partial<TaskItem> }) =>
      api.tasks.update(taskId, data),
    onMutate: async ({ taskId, data }) => {
      await queryClient.cancelQueries({ queryKey: ["tasks", projectId] });
      const previous = queryClient.getQueryData(["tasks", projectId]);
      queryClient.setQueryData(["tasks", projectId], (old: TaskItem[]) =>
        old?.map((t) => (t.id === taskId ? { ...t, ...data } : t)) ?? []
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

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (taskId: number) => api.tasks.delete(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setDeletingTask(null);
    },
  });

  // Start execution
  async function handleStartExecution(task: TaskItem) {
    try {
      let sessionId = dashboardSession;
      if (!sessionId) {
        const session = await api.sessions.create({
          name: `Dashboard-${project?.name || projectId}`,
          project_id: projectId,
        });
        sessionId = session.id;
        setDashboardSession(sessionId);
      }
      await api.sessions.startTask(sessionId, task.id, {
        phase: task.phase || "implementation",
      });
      setActiveExecutions((prev) => new Set(prev).add(task.id));
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    } catch (err) {
      console.error("Failed to start execution:", err);
    }
  }

  // Stop execution
  async function handleStopExecution(task: TaskItem) {
    if (!dashboardSession) return;
    try {
      await api.sessions.stopTask(dashboardSession, task.id, {
        status: "paused",
      });
      setActiveExecutions((prev) => {
        const next = new Set(prev);
        next.delete(task.id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
    } catch (err) {
      console.error("Failed to stop execution:", err);
    }
  }

  const columnTasks = useMemo(() => {
    const grouped: Record<string, TaskItem[]> = {};
    for (const col of COLUMNS) {
      grouped[col.id] = [];
    }
    for (const task of tasks) {
      const colId = getColumnId(task);
      if (grouped[colId]) {
        grouped[colId].push(task);
      } else {
        grouped["todo"].push(task);
      }
    }
    for (const col of COLUMNS) {
      grouped[col.id].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
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
      if (task) {
        const currentColId = getColumnId(task);
        if (currentColId !== overColumn.id) {
          updateMutation.mutate({
            taskId,
            data: {
              status: overColumn.status,
              phase: overColumn.phase,
            },
          });
        }
      }
      return;
    }

    // Dropped on another task -- find which column it belongs to
    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask) {
      const task = tasks.find((t) => t.id === taskId);
      const overColId = getColumnId(overTask);
      if (task) {
        const currentColId = getColumnId(task);
        if (currentColId !== overColId) {
          const col = COLUMNS.find((c) => c.id === overColId);
          if (col) {
            updateMutation.mutate({
              taskId,
              data: {
                status: col.status,
                phase: col.phase,
              },
            });
          }
        }
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
        <div className="grid grid-cols-7 gap-3 min-h-[calc(100vh-12rem)]">
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
                  <TaskCard
                    key={task.id}
                    task={task}
                    activeExecution={activeExecutions.has(task.id)}
                    onEdit={() => setEditingTask(task)}
                    onDelete={() => setDeletingTask(task)}
                    onStartExecution={() => handleStartExecution(task)}
                    onStopExecution={() => handleStopExecution(task)}
                  />
                ))}
              </SortableContext>
            </KanbanColumn>
          ))}
        </div>

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isDragOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Edit dialog */}
      <TaskFormDialog
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        projectId={projectId}
        task={editingTask ?? undefined}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deletingTask}
        onClose={() => setDeletingTask(null)}
        title="작업 삭제"
      >
        <p className="text-sm text-muted-foreground mb-4">
          &ldquo;{deletingTask?.title}&rdquo;을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setDeletingTask(null)}
            className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
          >
            취소
          </button>
          <button
            onClick={() => deletingTask && deleteMutation.mutate(deletingTask.id)}
            disabled={deleteMutation.isPending}
            className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 disabled:opacity-50"
          >
            {deleteMutation.isPending ? "삭제 중..." : "삭제"}
          </button>
        </div>
      </Dialog>
    </div>
  );
}
