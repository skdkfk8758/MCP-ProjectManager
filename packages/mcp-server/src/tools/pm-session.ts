import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiRequest, apiPost, apiPut, apiDelete } from "../client/api-client.js";
import type { SessionInfo, TaskExecution } from "../types/project.js";

export function registerPmSessionTools(server: McpServer): void {
  // 1. pm_session_list - List sessions with optional filters
  server.tool(
    "pm_session_list",
    "List sessions with optional filters",
    {
      project_id: z.number().optional().describe("Filter by project ID"),
      active_only: z.boolean().optional().describe("Only show active (no end_time) sessions"),
      limit: z.number().optional().describe("Max results (default 20)"),
    },
    async ({ project_id, active_only, limit }) => {
      try {
        const params = new URLSearchParams();
        if (project_id !== undefined) params.set("project_id", String(project_id));
        if (active_only) params.set("active_only", "true");
        if (limit !== undefined) params.set("limit", String(limit));

        const query = params.toString();
        const url = `/api/sessions${query ? `?${query}` : ""}`;
        const sessions = await apiRequest<SessionInfo[]>(url);

        if (sessions.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No sessions found." }],
          };
        }

        const lines = sessions.map(
          (s) => {
            const status = s.end_time ? "ended" : "active";
            const name = s.name ? ` "${s.name}"` : "";
            const tasks = s.active_task_count ? ` (${s.active_task_count} active tasks)` : "";
            return `${s.id} [${status}]${name} - ${s.event_count || 0} events${tasks}`;
          }
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Sessions (${sessions.length}):\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to list sessions: ${error}` }],
        };
      }
    }
  );

  // 2. pm_session_get - Get session details
  server.tool(
    "pm_session_get",
    "Get detailed information about a session including active tasks",
    {
      session_id: z.string().describe("Session ID (UUID)"),
    },
    async ({ session_id }) => {
      try {
        const [session, tasks] = await Promise.all([
          apiRequest<SessionInfo>(`/api/sessions/${session_id}`),
          apiRequest<TaskExecution[]>(`/api/sessions/${session_id}/tasks`),
        ]);

        const result = {
          ...session,
          task_executions: tasks,
        };

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to get session: ${error}` }],
        };
      }
    }
  );

  // 3. pm_session_update - Update session name/description/project
  server.tool(
    "pm_session_update",
    "Update a session's name, description, or project association",
    {
      session_id: z.string().describe("Session ID (UUID)"),
      name: z.string().optional().describe("Session name"),
      description: z.string().optional().describe("Session description"),
      project_id: z.number().optional().describe("Associate session with a project"),
    },
    async ({ session_id, name, description, project_id }) => {
      try {
        const body: Record<string, unknown> = {};
        if (name !== undefined) body.name = name;
        if (description !== undefined) body.description = description;
        if (project_id !== undefined) body.project_id = project_id;

        const session = await apiPut<SessionInfo>(`/api/sessions/${session_id}`, body);
        const displayName = session.name ? ` "${session.name}"` : "";
        return {
          content: [
            {
              type: "text" as const,
              text: `Session ${session_id}${displayName} updated`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to update session: ${error}` }],
        };
      }
    }
  );

  // 4. pm_session_delete - Delete a session
  server.tool(
    "pm_session_delete",
    "Delete a session and all its events",
    {
      session_id: z.string().describe("Session ID (UUID) to delete"),
    },
    async ({ session_id }) => {
      try {
        await apiDelete(`/api/sessions/${session_id}`);
        return {
          content: [{ type: "text" as const, text: `Session ${session_id} deleted` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to delete session: ${error}` }],
        };
      }
    }
  );

  // 5. pm_task_start_work - Start working on a task in a session
  server.tool(
    "pm_task_start_work",
    "Start working on a task within a session. Creates a TaskExecution and sets task status to in_progress.",
    {
      task_id: z.number().describe("Task ID to start working on"),
      session_id: z.string().describe("Session ID where work is happening"),
      notes: z.string().optional().describe("Optional notes about the work"),
    },
    async ({ task_id, session_id, notes }) => {
      try {
        const body: Record<string, unknown> = {};
        if (notes) body.notes = notes;

        const execution = await apiPost<TaskExecution>(
          `/api/sessions/${session_id}/tasks/${task_id}/start`,
          body
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Started work on task #${task_id}${execution.task_title ? ` "${execution.task_title}"` : ""} in session ${session_id} (execution #${execution.id})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to start task work: ${error}` }],
        };
      }
    }
  );

  // 6. pm_task_stop_work - Stop working on a task
  server.tool(
    "pm_task_stop_work",
    "Stop working on a task. Sets execution status to completed or paused.",
    {
      task_id: z.number().describe("Task ID to stop working on"),
      session_id: z.string().describe("Session ID where work was happening"),
      status: z.enum(["completed", "paused"]).default("completed").describe("Stop status"),
      notes: z.string().optional().describe("Optional completion/pause notes"),
    },
    async ({ task_id, session_id, status, notes }) => {
      try {
        const body: Record<string, unknown> = { status };
        if (notes) body.notes = notes;

        const execution = await apiPost<TaskExecution>(
          `/api/sessions/${session_id}/tasks/${task_id}/stop`,
          body
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Stopped work on task #${task_id}${execution.task_title ? ` "${execution.task_title}"` : ""} [${status}] (execution #${execution.id})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to stop task work: ${error}` }],
        };
      }
    }
  );
}
