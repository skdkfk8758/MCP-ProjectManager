import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiRequest } from "../client/api-client.js";
import type { DashboardSummary } from "../types/query.js";

export function registerPmQueryTools(server: McpServer): void {
  server.tool(
    "pm_dashboard_summary",
    "Get a dashboard summary with KPIs: projects, tasks, completion rate, sessions, tokens",
    {},
    async () => {
      try {
        const summary = await apiRequest<DashboardSummary>("/api/dashboard/overview");
        const lines = [
          `=== Dashboard Summary ===`,
          `Total Projects:    ${summary.total_projects}`,
          `Active Tasks:      ${summary.active_tasks}`,
          `Completion Rate:   ${(summary.completion_rate * 100).toFixed(1)}%`,
          `Today's Sessions:  ${summary.today_sessions}`,
          `Total Tokens Used: ${summary.total_tokens_used.toLocaleString()}`,
        ];

        if (summary.recent_activity && summary.recent_activity.length > 0) {
          lines.push("", "--- Recent Activity ---");
          for (const item of summary.recent_activity.slice(0, 5)) {
            lines.push(`  [${item.type}] ${item.description} (${item.timestamp})`);
          }
        }

        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to get dashboard summary: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_timeline",
    "Get timeline data for sessions and events over a period",
    {
      project_id: z.number().optional().describe("Filter by project ID"),
      days: z.number().default(30).describe("Number of days to look back"),
    },
    async ({ project_id, days }) => {
      try {
        const params = new URLSearchParams();
        if (project_id !== undefined) params.set("project_id", String(project_id));
        params.set("days", String(days));

        const data = await apiRequest<Record<string, unknown>>(
          `/api/dashboard/trends?${params.toString()}`
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to get timeline: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_flow_graph",
    "Get agent execution statistics and flow graph data",
    {
      days: z.number().default(30).describe("Number of days to look back"),
    },
    async ({ days }) => {
      try {
        const params = new URLSearchParams();
        params.set("days", String(days));

        const data = await apiRequest<Record<string, unknown>>(
          `/api/dashboard/agent-stats?${params.toString()}`
        );
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to get flow graph data: ${error}` }],
        };
      }
    }
  );
}
