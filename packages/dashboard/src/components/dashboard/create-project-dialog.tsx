"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Dialog } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

export function CreateProjectButton() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (data: { name: string; description: string }) =>
      api.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setName("");
      setDescription("");
    },
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
      >
        <Plus className="w-4 h-4" />
        New Project
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Create Project"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim())
              mutation.mutate({
                name: name.trim(),
                description: description.trim(),
              });
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm text-muted-foreground mb-1">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Project name"
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
              disabled={!name.trim() || mutation.isPending}
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
