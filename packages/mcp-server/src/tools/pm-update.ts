import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execSync } from "child_process";
import path from "path";
import os from "os";

export function registerPmUpdateTools(server: McpServer): void {
  server.tool(
    "pm_self_update",
    "Update MCP ProjectManager to the latest version. Pulls latest code, rebuilds all packages, and restarts backend/dashboard services.",
    {},
    async () => {
      const installDir = path.join(os.homedir(), ".mcp-pm", "MCP_ProjectManager");
      const logLines: string[] = [];
      const execOpts = { cwd: installDir, stdio: "pipe" as const, timeout: 120_000 };

      try {
        // 1. git pull
        const oldHead = execSync("git rev-parse HEAD", execOpts).toString().trim();
        execSync("git pull --ff-only", execOpts);
        const newHead = execSync("git rev-parse HEAD", execOpts).toString().trim();

        if (oldHead === newHead) {
          return {
            content: [{ type: "text" as const, text: "Already up to date. No changes to apply." }],
          };
        }

        logLines.push(`Updated: ${oldHead.slice(0, 7)} → ${newHead.slice(0, 7)}`);

        // 2. pnpm install
        try {
          execSync("pnpm install --frozen-lockfile", execOpts);
          logLines.push("Dependencies installed");
        } catch (e) {
          logLines.push(`Warning: pnpm install failed (${e instanceof Error ? e.message : e}), continuing...`);
        }

        // 3. Rebuild all packages
        try {
          execSync("pnpm turbo build", { ...execOpts, timeout: 180_000 });
          logLines.push("All packages rebuilt");
        } catch (e) {
          logLines.push(`Error: build failed - ${e instanceof Error ? e.message : e}`);
          return {
            content: [{ type: "text" as const, text: `Update partially failed at build step:\n${logLines.join("\n")}` }],
          };
        }

        // 4. Restart backend (port 48293)
        try {
          execSync("kill $(lsof -i :48293 -sTCP:LISTEN -t) 2>/dev/null || true", {
            stdio: "pipe",
            timeout: 5_000,
          });
        } catch {
          // no existing process, that's fine
        }

        try {
          const logsDir = path.join(os.homedir(), ".mcp-pm", "logs");
          execSync(`mkdir -p ${logsDir}`, { stdio: "pipe" });
          const venvUvicorn = path.join(installDir, "packages/backend/.venv/bin/uvicorn");
          const backendDir = path.join(installDir, "packages/backend");
          execSync(
            `nohup ${venvUvicorn} app.main:app --host 0.0.0.0 --port 48293 --app-dir ${backendDir} > ${logsDir}/backend.log 2>&1 &`,
            { stdio: "pipe", timeout: 10_000 }
          );
          logLines.push("Backend restarted");
        } catch (e) {
          logLines.push(`Warning: backend restart failed (${e instanceof Error ? e.message : e})`);
        }

        // 5. Restart dashboard (port 48294)
        try {
          execSync("kill $(lsof -i :48294 -sTCP:LISTEN -t) 2>/dev/null || true", {
            stdio: "pipe",
            timeout: 5_000,
          });
        } catch {
          // no existing process, that's fine
        }

        try {
          const logsDir = path.join(os.homedir(), ".mcp-pm", "logs");
          const dashboardDir = path.join(installDir, "packages/dashboard");
          execSync(
            `cd ${dashboardDir} && nohup npm run start > ${logsDir}/dashboard.log 2>&1 &`,
            { stdio: "pipe", timeout: 10_000 }
          );
          logLines.push("Dashboard restarted");
        } catch (e) {
          logLines.push(`Warning: dashboard restart failed (${e instanceof Error ? e.message : e})`);
        }

        // 6. Final notice
        logLines.push("");
        logLines.push("MCP Server changes will take effect after restarting Claude Code.");

        return {
          content: [{ type: "text" as const, text: logLines.join("\n") }],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Self-update failed: ${error instanceof Error ? error.message : error}\n${logLines.length > 0 ? `\nPartial log:\n${logLines.join("\n")}` : ""}`,
            },
          ],
        };
      }
    }
  );
}
