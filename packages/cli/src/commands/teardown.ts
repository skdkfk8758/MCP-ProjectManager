import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, rmSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { getPidDir, BACKEND_PORT, DASHBOARD_PORT } from "../utils.js";

function log(msg: string) { console.log(`\x1b[34m[MCP-PM]\x1b[0m ${msg}`); }
function ok(msg: string)  { console.log(`\x1b[32m[  OK  ]\x1b[0m ${msg}`); }
function warn(msg: string){ console.log(`\x1b[33m[ WARN ]\x1b[0m ${msg}`); }

function stopService(name: string, port: number): void {
  const pidDir = getPidDir();
  const pidFile = join(pidDir, `${name}.pid`);

  if (existsSync(pidFile)) {
    const pid = parseInt(readFileSync(pidFile, "utf-8").trim(), 10);
    if (!isNaN(pid)) {
      try {
        process.kill(pid, 0); // check if alive
        process.kill(pid, "SIGTERM");
        // Wait up to 5 seconds for graceful shutdown
        for (let i = 0; i < 5; i++) {
          try { process.kill(pid, 0); } catch { break; }
          execSync("sleep 1");
        }
        // Force kill if still alive
        try {
          process.kill(pid, 0);
          process.kill(pid, "SIGKILL");
        } catch { /* already dead */ }
        ok(`Stopped ${name} (pid ${pid})`);
      } catch {
        warn(`${name} (pid ${pid}) was not running`);
      }
    }
    unlinkSync(pidFile);
  } else {
    // Fallback: find by port
    try {
      const pid = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null | head -1`, { encoding: "utf-8" }).trim();
      if (pid) {
        process.kill(parseInt(pid, 10), "SIGTERM");
        ok(`Stopped ${name} on port ${port} (pid ${pid})`);
      } else {
        warn(`No ${name} process found on port ${port}`);
      }
    } catch {
      warn(`No ${name} process found on port ${port}`);
    }
  }
}

export async function teardown(): Promise<void> {
  console.log("\n\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m");
  console.log("\x1b[34m  MCP ProjectManager - Teardown\x1b[0m");
  console.log("\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n");

  // Step 1: Stop services
  log("Stopping services...");
  stopService("backend", BACKEND_PORT);
  stopService("dashboard", DASHBOARD_PORT);

  // Clean PID directory
  const pidDir = getPidDir();
  if (existsSync(pidDir)) {
    rmSync(pidDir, { recursive: true, force: true });
  }

  // Step 2: Remove MCP server and hooks from settings
  log("Cleaning Claude Code settings...");
  const projectDir = process.cwd();
  const settingsPath = join(projectDir, ".claude", "settings.local.json");

  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));

      // Remove MCP server
      if (settings.mcpServers) {
        delete settings.mcpServers["mcp-project-manager"];
        if (Object.keys(settings.mcpServers).length === 0) {
          delete settings.mcpServers;
        }
      }

      // Remove hooks containing our backend URL
      if (settings.hooks) {
        for (const [event, handlers] of Object.entries(settings.hooks as Record<string, any[]>)) {
          settings.hooks[event] = handlers.filter(
            (h: any) => !(h.command && h.command.includes(`${BACKEND_PORT}/api/`))
          );
          if (settings.hooks[event].length === 0) {
            delete settings.hooks[event];
          }
        }
        if (Object.keys(settings.hooks).length === 0) {
          delete settings.hooks;
        }
      }

      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      ok("Removed MCP server and hooks from settings");
    } catch {
      warn("Failed to parse settings file");
    }
  } else {
    warn(`No settings file found at ${settingsPath}`);
  }

  // Summary
  console.log("\n\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m");
  console.log("\x1b[32m  MCP ProjectManager Teardown Complete\x1b[0m");
  console.log("\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n");
  console.log("  Services stopped, MCP server and hooks removed.");
  console.log("  \x1b[33mRestart Claude Code to apply changes.\x1b[0m");
  console.log("\n  Note: Project data in ~/.mcp-pm/mcp_pm.db is preserved.");
  console.log(`  To re-setup: \x1b[34mmcp-pm setup\x1b[0m\n`);
}
