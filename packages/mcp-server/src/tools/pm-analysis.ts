import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiPost, apiRequest } from "../client/api-client.js";

export function registerPmAnalysisTools(server: McpServer): void {
  server.tool(
    "pm_analyze_bottleneck",
    "Analyze workflow bottlenecks across sessions and tasks",
    {},
    async () => {
      try {
        const result = await apiPost<Record<string, unknown>>(
          "/api/ai/analyze/bottlenecks",
          {}
        );
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
          content: [{ type: "text" as const, text: `Failed to analyze bottlenecks: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_suggest_next_task",
    "Get AI-powered suggestions for the next task to work on",
    {},
    async () => {
      try {
        const result = await apiRequest<Record<string, unknown>>(
          "/api/ai/suggestions/next-tasks"
        );
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
          content: [{ type: "text" as const, text: `Failed to get task suggestions: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_report_generate",
    "Generate an AI-powered project report with recommendations",
    {},
    async () => {
      try {
        const result = await apiPost<Record<string, unknown>>(
          "/api/ai/analyze/recommendations",
          {}
        );
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
          content: [{ type: "text" as const, text: `Failed to generate report: ${error}` }],
        };
      }
    }
  );
}
