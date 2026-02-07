import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiPost } from "../client/api-client.js";

export function registerFlowEventTools(server: McpServer): void {
  server.tool(
    "flow_task_start",
    "Record the start of a task/work item in the current session",
    {
      session_id: z.string().describe("Current session UUID"),
      task_name: z.string().describe("Name of the task"),
      description: z.string().optional().describe("Task description"),
      project_id: z.number().optional().describe("Associated project ID"),
    },
    async ({ session_id, task_name, description, project_id }) => {
      try {
        await apiPost("/api/events", {
          session_id,
          event_type: "task_start",
          payload: { task_name, description, project_id },
        });
        return {
          content: [{ type: "text" as const, text: `Task '${task_name}' started` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to record task start: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "flow_task_end",
    "Record the end of a task/work item",
    {
      session_id: z.string().describe("Current session UUID"),
      task_name: z.string().describe("Name of the task"),
      status: z.enum(["completed", "failed", "cancelled"]).describe("Task outcome"),
      duration_ms: z.number().optional().describe("Duration in milliseconds"),
      error: z.string().optional().describe("Error message if failed"),
    },
    async ({ session_id, task_name, status, duration_ms, error }) => {
      try {
        await apiPost("/api/events", {
          session_id,
          event_type: "task_end",
          payload: { task_name, status, duration_ms, error },
        });
        return {
          content: [{ type: "text" as const, text: `Task '${task_name}' ended with status: ${status}` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Failed to record task end: ${err}` }],
        };
      }
    }
  );

  server.tool(
    "flow_skill_call",
    "Record a skill invocation (e.g. autopilot, ralph, ultrawork)",
    {
      session_id: z.string().describe("Current session UUID"),
      skill_name: z.string().describe("Name of the skill invoked"),
      trigger: z.enum(["auto", "manual"]).describe("How the skill was triggered"),
      parameters: z.record(z.unknown()).optional().describe("Skill parameters"),
    },
    async ({ session_id, skill_name, trigger, parameters }) => {
      try {
        await apiPost("/api/events", {
          session_id,
          event_type: "skill_call",
          payload: { skill_name, trigger, parameters },
        });
        return {
          content: [{ type: "text" as const, text: `Skill '${skill_name}' recorded (trigger: ${trigger})` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to record skill call: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "flow_error",
    "Record an error that occurred during the session",
    {
      session_id: z.string().describe("Current session UUID"),
      error_type: z.string().describe("Type/category of the error"),
      message: z.string().describe("Error message"),
      stack_trace: z.string().optional().describe("Stack trace if available"),
      tool_name: z.string().optional().describe("Tool that caused the error"),
    },
    async ({ session_id, error_type, message, stack_trace, tool_name }) => {
      try {
        await apiPost("/api/errors", {
          session_id,
          error_type,
          message,
          stack_trace,
          tool_name,
        });
        return {
          content: [{ type: "text" as const, text: `Error recorded: [${error_type}] ${message}` }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Failed to record error: ${err}` }],
        };
      }
    }
  );
}
