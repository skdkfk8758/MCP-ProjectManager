import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiPost, apiPut } from "../client/api-client.js";

export function registerFlowSessionTools(server: McpServer): void {
  server.tool(
    "flow_session_start",
    "Start a new tracking session for Claude Code workflow",
    {
      session_id: z.string().describe("Unique session UUID"),
      project_id: z.number().optional().describe("Associated project ID"),
    },
    async ({ session_id, project_id }) => {
      try {
        await apiPost("/api/sessions", {
          id: session_id,
          project_id,
        });
        return {
          content: [{ type: "text" as const, text: `Session '${session_id}' started` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to start session: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "flow_session_end",
    "End an active tracking session",
    {
      session_id: z.string().describe("Session UUID to end"),
      summary: z.string().optional().describe("Session summary"),
      token_usage: z
        .object({
          input: z.number().describe("Input tokens used"),
          output: z.number().describe("Output tokens used"),
        })
        .optional()
        .describe("Token usage for the session"),
    },
    async ({ session_id, summary, token_usage }) => {
      try {
        await apiPut(`/api/sessions/${session_id}`, {
          summary,
          token_usage,
        });
        return {
          content: [{ type: "text" as const, text: `Session '${session_id}' ended` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to end session: ${error}` }],
        };
      }
    }
  );
}
