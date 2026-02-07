import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiPost, apiPut, apiRequest } from "../client/api-client.js";
import type { Milestone } from "../types/project.js";

export function registerPmMilestoneTools(server: McpServer): void {
  server.tool(
    "pm_milestone_create",
    "Create a new milestone within a project",
    {
      project_id: z.number().describe("Project ID"),
      title: z.string().describe("Milestone title"),
      description: z.string().optional().describe("Milestone description"),
      due_date: z.string().optional().describe("Due date (ISO 8601 format)"),
    },
    async ({ project_id, title, description, due_date }) => {
      try {
        const milestone = await apiPost<Milestone>("/api/milestones", {
          project_id,
          title,
          description,
          due_date,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Milestone created: #${milestone.id} "${milestone.title}"`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to create milestone: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_milestone_update",
    "Update an existing milestone",
    {
      id: z.number().describe("Milestone ID"),
      title: z.string().optional().describe("New milestone title"),
      description: z.string().optional().describe("New milestone description"),
      due_date: z.string().optional().describe("New due date (ISO 8601 format)"),
      status: z.string().optional().describe("New status (pending/in_progress/completed/overdue)"),
    },
    async ({ id, title, description, due_date, status }) => {
      try {
        const milestone = await apiPut<Milestone>(`/api/milestones/${id}`, {
          title,
          description,
          due_date,
          status,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Milestone #${id} updated: "${milestone.title}" [${milestone.status}]`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to update milestone: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_milestone_list",
    "List milestones, optionally filtered by project",
    {
      project_id: z.number().optional().describe("Filter by project ID"),
    },
    async ({ project_id }) => {
      try {
        const params = new URLSearchParams();
        if (project_id !== undefined) params.set("project_id", String(project_id));

        const query = params.toString();
        const url = `/api/milestones${query ? `?${query}` : ""}`;
        const milestones = await apiRequest<Milestone[]>(url);

        if (milestones.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No milestones found." }],
          };
        }

        const lines = milestones.map(
          (m) =>
            `#${m.id} [${m.status}] ${m.title}${m.due_date ? ` (due: ${m.due_date})` : ""}`
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Milestones (${milestones.length}):\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to list milestones: ${error}` }],
        };
      }
    }
  );
}
