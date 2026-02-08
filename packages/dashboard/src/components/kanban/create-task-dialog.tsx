"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TaskFormDialog } from "./task-form-dialog";

interface CreateTaskButtonProps {
  projectId: number;
}

export function CreateTaskButton({ projectId }: CreateTaskButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        작업 추가
      </button>
      <TaskFormDialog
        open={open}
        onClose={() => setOpen(false)}
        projectId={projectId}
      />
    </>
  );
}
