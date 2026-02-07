import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiPost, apiPut, apiDelete, apiRequest } from "../client/api-client.js";
import type { Task } from "../types/project.js";

export function registerPmTaskTools(server: McpServer): void {
  server.tool(
    "pm_task_create",
    "Create a new task within a project",
    {
      project_id: z.number().describe("Project ID to create the task in"),
      title: z.string().describe("Task title"),
      description: z.string().optional().describe("Task description"),
      priority: z.enum(["low", "medium", "high", "critical"]).describe("Task priority"),
      status: z
        .enum(["todo", "in_progress", "done"])
        .default("todo")
        .describe("Initial task status"),
      due_date: z.string().optional().describe("Due date (ISO 8601 format)"),
    },
    async ({ project_id, title, description, priority, status, due_date }) => {
      try {
        const task = await apiPost<Task>("/api/tasks", {
          project_id,
          title,
          description,
          priority,
          status,
          due_date,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Task created: #${task.id} "${task.title}" [${task.priority}/${task.status}]`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to create task: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_task_update",
    "Update an existing task",
    {
      id: z.number().describe("Task ID"),
      title: z.string().optional().describe("New task title"),
      description: z.string().optional().describe("New task description"),
      priority: z.string().optional().describe("New priority (low/medium/high/critical)"),
      status: z.string().optional().describe("New status (todo/in_progress/done)"),
      due_date: z.string().optional().describe("New due date (ISO 8601 format)"),
    },
    async ({ id, title, description, priority, status, due_date }) => {
      try {
        const task = await apiPut<Task>(`/api/tasks/${id}`, {
          title,
          description,
          priority,
          status,
          due_date,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Task #${id} updated: "${task.title}" [${task.priority}/${task.status}]`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to update task: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_task_delete",
    "Delete a task",
    {
      id: z.number().describe("Task ID to delete"),
    },
    async ({ id }) => {
      try {
        await apiDelete(`/api/tasks/${id}`);
        return {
          content: [{ type: "text" as const, text: `Task #${id} deleted` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to delete task: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_task_list",
    "List tasks with optional filters",
    {
      project_id: z.number().optional().describe("Filter by project ID"),
      status: z.string().optional().describe("Filter by status (todo/in_progress/done)"),
      priority: z.string().optional().describe("Filter by priority (low/medium/high/critical)"),
    },
    async ({ project_id, status, priority }) => {
      try {
        const params = new URLSearchParams();
        if (project_id !== undefined) params.set("project_id", String(project_id));
        if (status) params.set("status", status);
        if (priority) params.set("priority", priority);

        const query = params.toString();
        const url = `/api/tasks${query ? `?${query}` : ""}`;
        const tasks = await apiRequest<Task[]>(url);

        if (tasks.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No tasks found." }],
          };
        }

        const lines = tasks.map(
          (t) =>
            `#${t.id} [${t.priority}/${t.status}] ${t.title}${t.due_date ? ` (due: ${t.due_date})` : ""}`
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Tasks (${tasks.length}):\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to list tasks: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_task_get",
    "Get detailed information about a specific task",
    {
      id: z.number().describe("Task ID"),
    },
    async ({ id }) => {
      try {
        const task = await apiRequest<Task>(`/api/tasks/${id}`);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(task, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to get task: ${error}` }],
        };
      }
    }
  );
}
