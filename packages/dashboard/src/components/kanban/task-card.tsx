"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { GripVertical, Calendar } from "lucide-react";
import { format } from "date-fns";
import { type TaskItem } from "@/lib/api";

const priorityColors: Record<string, string> = {
  critical: "border-l-red-500 bg-red-500/5",
  high: "border-l-orange-500 bg-orange-500/5",
  medium: "border-l-yellow-500 bg-yellow-500/5",
  low: "border-l-green-500 bg-green-500/5",
};

const priorityBadgeColors: Record<string, string> = {
  critical: "bg-red-500/10 text-red-400",
  high: "bg-orange-500/10 text-orange-400",
  medium: "bg-yellow-500/10 text-yellow-400",
  low: "bg-green-500/10 text-green-400",
};

interface TaskCardProps {
  task: TaskItem;
  isDragOverlay?: boolean;
}

export function TaskCard({ task, isDragOverlay }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md border border-border bg-card p-3 border-l-2 cursor-pointer",
        priorityColors[task.priority] || priorityColors.medium,
        isDragging && "opacity-50",
        isDragOverlay && "shadow-lg ring-2 ring-primary/20 rotate-2"
      )}
    >
      <div className="flex items-start gap-2">
        <button
          aria-label={`Drag to reorder: ${task.title}`}
          className="text-muted-foreground hover:text-foreground mt-0.5 cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{task.title}</p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-2">
            <span
              className={cn(
                "text-xs px-1.5 py-0.5 rounded",
                priorityBadgeColors[task.priority] ||
                  priorityBadgeColors.medium
              )}
            >
              {task.priority}
            </span>
            {task.due_date && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {format(new Date(task.due_date), "MMM d")}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
