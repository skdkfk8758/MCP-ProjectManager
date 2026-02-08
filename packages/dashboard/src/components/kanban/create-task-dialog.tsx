"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Dialog } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

interface CreateTaskButtonProps {
  projectId: number;
}

export function CreateTaskButton({ projectId }: CreateTaskButtonProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: any) => api.tasks.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setPriority("medium");
    },
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        작업 추가
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="작업 만들기">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (title.trim()) {
              mutation.mutate({
                project_id: projectId,
                title: title.trim(),
                description: description.trim() || undefined,
                priority,
                status: "todo",
              });
            }
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              제목
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="작업 제목"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              설명
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              placeholder="설명 (선택)"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              우선순위
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="low">낮음</option>
              <option value="medium">보통</option>
              <option value="high">높음</option>
              <option value="critical">긴급</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!title.trim() || mutation.isPending}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {mutation.isPending ? "생성 중..." : "만들기"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
