import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { apiPost, apiPut, apiDelete, apiRequest } from "../client/api-client.js";
import type { Project } from "../types/project.js";

export function registerPmProjectTools(server: McpServer): void {
  server.tool(
    "pm_project_create",
    "Create a new project",
    {
      name: z.string().describe("Project name"),
      description: z.string().optional().describe("Project description"),
      path: z.string().optional().describe("Project filesystem path"),
    },
    async ({ name, description, path }) => {
      try {
        const project = await apiPost<Project>("/api/projects", {
          name,
          description,
          path,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Project created: #${project.id} "${project.name}"`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to create project: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_project_update",
    "Update an existing project",
    {
      id: z.number().describe("Project ID"),
      name: z.string().optional().describe("New project name"),
      description: z.string().optional().describe("New project description"),
      status: z.string().optional().describe("New status (active/completed/archived)"),
    },
    async ({ id, name, description, status }) => {
      try {
        const project = await apiPut<Project>(`/api/projects/${id}`, {
          name,
          description,
          status,
        });
        return {
          content: [
            {
              type: "text" as const,
              text: `Project #${id} updated: "${project.name}"`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to update project: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_project_delete",
    "Delete a project",
    {
      id: z.number().describe("Project ID to delete"),
    },
    async ({ id }) => {
      try {
        await apiDelete(`/api/projects/${id}`);
        return {
          content: [{ type: "text" as const, text: `Project #${id} deleted` }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to delete project: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_project_list",
    "List all projects",
    {},
    async () => {
      try {
        const projects = await apiRequest<Project[]>("/api/projects");
        if (projects.length === 0) {
          return {
            content: [{ type: "text" as const, text: "No projects found." }],
          };
        }
        const lines = projects.map(
          (p) => `#${p.id} [${p.status}] ${p.name}${p.description ? ` - ${p.description}` : ""}`
        );
        return {
          content: [
            {
              type: "text" as const,
              text: `Projects (${projects.length}):\n${lines.join("\n")}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to list projects: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_project_get",
    "Get detailed information about a specific project",
    {
      id: z.number().describe("Project ID"),
    },
    async ({ id }) => {
      try {
        const project = await apiRequest<Project>(`/api/projects/${id}`);
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(project, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to get project: ${error}` }],
        };
      }
    }
  );

  server.tool(
    "pm_project_init_from_git",
    "Initialize a project from git history. Imports commits as events, tags as milestones, file changes, and daily stats.",
    {
      project_path: z.string().describe("Absolute path to the git repository"),
      project_name: z.string().optional().describe("Project name (default: directory name)"),
      max_commits: z.number().optional().describe("Max commits to import (default: 500)"),
      since: z.string().optional().describe("Import commits since date (YYYY-MM-DD)"),
    },
    async ({ project_path, project_name, max_commits, since }) => {
      try {
        const body: Record<string, unknown> = { project_path };
        if (project_name) body.project_name = project_name;
        if (max_commits) body.max_commits = max_commits;
        if (since) body.since = since;

        const result = await apiRequest<{
          status: string;
          project_id?: number;
          message?: string;
          counts?: {
            commits: number;
            sessions: number;
            events: number;
            file_changes: number;
            milestones: number;
            daily_stats: number;
          };
        }>("/api/seed/init-from-git", { method: "POST", body, timeout: 60000 });

        if (result.status === "error") {
          return {
            content: [{ type: "text" as const, text: `Failed: ${result.message}` }],
          };
        }

        const c = result.counts!;
        const lines = [
          `Project initialized from git history (ID: ${result.project_id})`,
          `  Commits: ${c.commits}`,
          `  Sessions: ${c.sessions} (grouped by date)`,
          `  Events: ${c.events}`,
          `  File changes: ${c.file_changes}`,
          `  Milestones: ${c.milestones} (from tags)`,
          `  Daily stats: ${c.daily_stats}`,
        ];
        return {
          content: [{ type: "text" as const, text: lines.join("\n") }],
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: `Failed to init from git: ${error}` }],
        };
      }
    }
  );
}
