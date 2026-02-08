"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type TaskItem } from "@/lib/api";
import { Dialog } from "@/components/ui/dialog";

interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: number;
  task?: TaskItem;
}

const PRIORITIES = [
  { value: "low", label: "낮음" },
  { value: "medium", label: "보통" },
  { value: "high", label: "높음" },
  { value: "critical", label: "긴급" },
];

const PHASES = [
  { value: "", label: "없음" },
  { value: "design", label: "설계" },
  { value: "implementation", label: "구현" },
  { value: "review", label: "리뷰" },
  { value: "testing", label: "테스트" },
];

const EXECUTION_MODES = [
  { value: "", label: "없음" },
  { value: "manual", label: "수동" },
  { value: "ralph", label: "Ralph" },
];

export function TaskFormDialog({ open, onClose, projectId, task }: TaskFormDialogProps) {
  const isEdit = !!task;
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [phase, setPhase] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [executionMode, setExecutionMode] = useState("");

  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description || "");
        setPriority(task.priority);
        setPhase(task.phase || "");
        setDueDate(task.due_date ? task.due_date.split("T")[0] : "");
        setExecutionMode(task.execution_mode || "");
      } else {
        setTitle("");
        setDescription("");
        setPriority("medium");
        setPhase("");
        setDueDate("");
        setExecutionMode("");
      }
    }
  }, [open, task]);

  const mutation = useMutation({
    mutationFn: (data: Partial<TaskItem>) =>
      isEdit ? api.tasks.update(task!.id, data) : api.tasks.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      onClose();
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!title.trim()) return;

    const data: Partial<TaskItem> = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
    };

    if (!isEdit) {
      data.project_id = projectId;
      data.status = "todo";
    }

    if (isEdit) {
      data.phase = phase || undefined;
      data.due_date = dueDate || undefined;
      data.execution_mode = executionMode || undefined;
    }

    mutation.mutate(data);
  }

  const inputClass =
    "w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary";

  return (
    <Dialog open={open} onClose={onClose} title={isEdit ? "작업 편집" : "작업 만들기"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-muted-foreground mb-1">제목</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="작업 제목"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-sm text-muted-foreground mb-1">설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass} resize-none`}
            rows={3}
            placeholder="설명 (선택)"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-muted-foreground mb-1">우선순위</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
          {isEdit && (
            <div>
              <label className="block text-sm text-muted-foreground mb-1">단계</label>
              <select value={phase} onChange={(e) => setPhase(e.target.value)} className={inputClass}>
                {PHASES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        {isEdit && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">마감일</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">실행 모드</label>
              <select value={executionMode} onChange={(e) => setExecutionMode(e.target.value)} className={inputClass}>
                {EXECUTION_MODES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={!title.trim() || mutation.isPending}
            className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
          >
            {mutation.isPending ? (isEdit ? "저장 중..." : "생성 중...") : isEdit ? "저장" : "만들기"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
