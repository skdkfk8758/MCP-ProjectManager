"use client";

import { useState, useRef, useEffect } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import {
  GripVertical,
  Calendar,
  MoreHorizontal,
  Pencil,
  Trash2,
  Play,
  Square,
} from "lucide-react";
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

const phaseBadgeConfig: Record<string, { label: string; color: string }> = {
  design: { label: "설계", color: "bg-violet-500/10 text-violet-400" },
  implementation: { label: "구현", color: "bg-blue-500/10 text-blue-400" },
  review: { label: "리뷰", color: "bg-amber-500/10 text-amber-400" },
  testing: { label: "테스트", color: "bg-teal-500/10 text-teal-400" },
};

interface TaskCardProps {
  task: TaskItem;
  isDragOverlay?: boolean;
  activeExecution?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onStartExecution?: () => void;
  onStopExecution?: () => void;
}

export function TaskCard({
  task,
  isDragOverlay,
  activeExecution,
  onEdit,
  onDelete,
  onStartExecution,
  onStopExecution,
}: TaskCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative rounded-md border border-border bg-card p-3 border-l-2 cursor-pointer",
        priorityColors[task.priority] || priorityColors.medium,
        isDragging && "opacity-50",
        isDragOverlay && "shadow-lg ring-2 ring-primary/20 rotate-2",
        activeExecution && "ring-1 ring-green-500/40"
      )}
    >
      {activeExecution && (
        <div className="flex items-center gap-1.5 mb-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
          </span>
          <span className="text-xs text-green-400 font-medium">실행 중</span>
        </div>
      )}
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
            {task.phase && phaseBadgeConfig[task.phase] && (
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  phaseBadgeConfig[task.phase].color
                )}
              >
                {phaseBadgeConfig[task.phase].label}
              </span>
            )}
            {task.due_date && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                {format(new Date(task.due_date), "MMM d")}
              </span>
            )}
          </div>
        </div>

        {/* More menu */}
        {!isDragOverlay && (
          <div ref={menuRef} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen(!menuOpen);
              }}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground p-0.5 rounded transition-opacity"
              aria-label="더보기"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-6 z-50 w-36 rounded-md border border-border bg-card shadow-lg py-1">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onEdit();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    편집
                  </button>
                )}
                {activeExecution
                  ? onStopExecution && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onStopExecution();
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-orange-400 hover:bg-muted transition-colors"
                      >
                        <Square className="w-3.5 h-3.5" />
                        실행 중지
                      </button>
                    )
                  : onStartExecution && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpen(false);
                          onStartExecution();
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-green-400 hover:bg-muted transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" />
                        실행 시작
                      </button>
                    )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-red-400 hover:bg-muted transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    삭제
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
