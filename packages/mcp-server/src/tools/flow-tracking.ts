import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiPost } from "../client/api-client.js";

export function registerFlowTrackingTools(server: McpServer): void {
  server.tool(
    "flow_tool_call",
    "Record a tool invocation during the session",
    {
      session_id: z.string().describe("Current session UUID"),
      tool_name: z.string().describe("Name of the tool called"),
      parameters: z.record(z.unknown()).optional().describe("Tool parameters"),
      duration_ms: z.number().optional().describe("Call duration in milliseconds"),
      success: z.boolean().describe("Whether the tool call succeeded"),
    },
    async ({ session_id, tool_name, parameters, duration_ms, success }) => {
      try {
        await apiPost("/api/events/tool-calls/batch", {
          tool_calls: [
            {
              session_id,
              tool_name,
              parameters,
              duration_ms,
              success,
            },
          ],
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Tool call '${tool_name}' recorded (success: ${success})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to record tool call: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "flow_file_change",
    "Record a file change made during the session",
    {
      session_id: z.string().describe("Current session UUID"),
      file_path: z.string().describe("Path of the changed file"),
      change_type: z.enum(["created", "modified", "deleted"]).describe("Type of file change"),
      lines_added: z.number().optional().describe("Number of lines added"),
      lines_removed: z.number().optional().describe("Number of lines removed"),
    },
    async ({ session_id, file_path, change_type, lines_added, lines_removed }) => {
      try {
        await apiPost("/api/events/file-changes/batch", {
          file_changes: [
            {
              session_id,
              file_path,
              change_type,
              lines_added,
              lines_removed,
            },
          ],
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `File change recorded: ${file_path} (${change_type})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to record file change: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "flow_commit",
    "Record a git commit made during the session",
    {
      session_id: z.string().describe("Current session UUID"),
      hash: z.string().describe("Git commit hash"),
      message: z.string().describe("Commit message"),
      files_changed: z.number().describe("Number of files changed in the commit"),
    },
    async ({ session_id, hash, message, files_changed }) => {
      try {
        await apiPost("/api/events", {
          session_id,
          event_type: "commit",
          payload: { hash, message, files_changed },
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Commit recorded: ${hash.substring(0, 7)} - ${message}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to record commit: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "flow_prompt",
    "Record a user prompt/message in the session",
    {
      session_id: z.string().describe("Current session UUID"),
      prompt_text: z.string().describe("The user's prompt text"),
      token_count: z.number().optional().describe("Estimated token count of the prompt"),
    },
    async ({ session_id, prompt_text, token_count }) => {
      try {
        await apiPost("/api/events", {
          session_id,
          event_type: "prompt",
          payload: { prompt_text, token_count },
        });
        return {
          content: [{ type: "text" as const, text: `Prompt recorded (${prompt_text.length} chars)` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to record prompt: ${error}` }],
        };
      }
    }
  );
}
