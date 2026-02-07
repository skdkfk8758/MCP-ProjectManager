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
        Add Task
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Create Task">
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
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Task title"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
              rows={3}
              placeholder="Optional description"
            />
          </div>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim() || mutation.isPending}
              className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {mutation.isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
