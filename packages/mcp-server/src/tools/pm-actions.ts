import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiPatch, apiPut } from "../client/api-client.js";
import type { Task } from "../types/project.js";

export function registerPmActionTools(server: McpServer): void {
  server.tool(
    "pm_task_move",
    "Move a task to a different status column (kanban board operation)",
    {
      task_id: z.number().describe("Task ID to move"),
      status: z
        .enum(["todo", "in_progress", "done", "archived"])
        .describe("Target status column"),
      sort_order: z.number().optional().describe("Position within the column"),
    },
    async ({ task_id, status, sort_order }) => {
      try {
        await apiPatch(`/api/tasks/${task_id}/status`, {
          status,
          sort_order,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Task #${task_id} moved to '${status}'${sort_order !== undefined ? ` at position ${sort_order}` : ""}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to move task: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_task_assign_priority",
    "Change the priority of a task",
    {
      task_id: z.number().describe("Task ID"),
      priority: z
        .enum(["low", "medium", "high", "critical"])
        .describe("New priority level"),
    },
    async ({ task_id, priority }) => {
      try {
        const task = await apiPut<Task>(`/api/tasks/${task_id}`, {
          priority,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Task #${task_id} priority set to '${priority}'`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to assign priority: ${error}` }],
        };
      }
    }
  );
}
