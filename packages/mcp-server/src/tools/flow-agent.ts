import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiPost } from "../client/api-client.js";

export function registerFlowAgentTools(server: McpServer): void {
  server.tool(
    "flow_agent_spawn",
    "Record when a sub-agent is spawned during orchestration",
    {
      session_id: z.string().describe("Current session UUID"),
      agent_type: z.string().describe("Agent type (e.g. executor, architect, explorer)"),
      model: z.string().describe("Model used (e.g. haiku, sonnet, opus)"),
      task_description: z.string().optional().describe("Description of the delegated task"),
    },
    async ({ session_id, agent_type, model, task_description }) => {
      try {
        const result = await apiPost<{ id: number }>("/api/events/agent-executions", {
          session_id,
          agent_type,
          model,
          task_description,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Agent '${agent_type}' (${model}) spawned. Execution ID: ${result.id}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to record agent spawn: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "flow_agent_complete",
    "Record when a sub-agent completes its work",
    {
      session_id: z.string().describe("Current session UUID"),
      agent_execution_id: z.number().describe("Agent execution ID from flow_agent_spawn"),
      status: z.enum(["completed", "failed"]).describe("Agent completion status"),
      duration_ms: z.number().optional().describe("Execution duration in milliseconds"),
      token_usage: z
        .object({
          input: z.number().describe("Input tokens used"),
          output: z.number().describe("Output tokens used"),
        })
        .optional()
        .describe("Token usage for this agent execution"),
    },
    async ({ session_id, agent_execution_id, status, duration_ms, token_usage }) => {
      try {
        await apiPost("/api/events", {
          session_id,
          event_type: "agent_complete",
          payload: { agent_execution_id, status, duration_ms, token_usage },
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Agent execution #${agent_execution_id} completed with status: ${status}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to record agent completion: ${error}` }],
        };
      }
    }
  );
}
