import { execSync, spawn } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import {
  getMonorepoRoot,
  getBackendDir,
  getDashboardDir,
  getPidDir,
  BACKEND_PORT,
  DASHBOARD_PORT,
  BACKEND_URL,
  DASHBOARD_URL,
} from "../utils.js";

function ensurePidDir(): void {
  const pidDir = getPidDir();
  if (!existsSync(pidDir)) {
    mkdirSync(pidDir, { recursive: true });
  }
}

function isProcessRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readPid(pidFile: string): number | null {
  if (!existsSync(pidFile)) return null;
  const pid = parseInt(readFileSync(pidFile, "utf-8").trim(), 10);
  if (isNaN(pid) || !isProcessRunning(pid)) {
    // Clean stale PID file
    try { unlinkSync(pidFile); } catch { /* ignore */ }
    return null;
  }
  return pid;
}

function isPortListening(port: number): boolean {
  try {
    const result = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null | head -1`, { encoding: "utf-8" }).trim();
    return result.length > 0;
  } catch {
    return false;
  }
}

function isHealthy(url: string): boolean {
  try {
    execSync(`curl -sf "${url}" >/dev/null 2>&1`, { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export async function start(service?: string): Promise<void> {
  ensurePidDir();
  const pidDir = getPidDir();
  const backendDir = getBackendDir();
  const dashboardDir = getDashboardDir();
  const target = service || "all";

  if (target === "all" || target === "backend") {
    const pidFile = join(pidDir, "backend.pid");
    const existingPid = readPid(pidFile);
    if (existingPid) {
      console.log(`Backend already running (PID: ${existingPid})`);
    } else if (isPortListening(BACKEND_PORT)) {
      console.log(`Backend already running on port ${BACKEND_PORT} (external process)`);
    } else {
      console.log("Starting backend...");
      const uvicornPath = join(backendDir, ".venv", "bin", "uvicorn");
      if (!existsSync(uvicornPath)) {
        console.error(`  Error: uvicorn not found at ${uvicornPath}`);
        console.error(`  Run 'mcp-pm setup' first to create the Python venv.`);
        process.exit(1);
      }
      const proc = spawn(uvicornPath, [
        "app.main:app",
        "--host", "0.0.0.0",
        "--port", String(BACKEND_PORT),
        "--app-dir", backendDir,
      ], { detached: true, stdio: "ignore" });
      proc.unref();
      if (proc.pid) {
        writeFileSync(pidFile, String(proc.pid));
        console.log(`  Backend started (PID: ${proc.pid}) on ${BACKEND_URL}`);
      }
    }
  }

  if (target === "all" || target === "dashboard") {
    const pidFile = join(pidDir, "dashboard.pid");
    const existingPid = readPid(pidFile);
    if (existingPid) {
      console.log(`Dashboard already running (PID: ${existingPid})`);
    } else if (isPortListening(DASHBOARD_PORT)) {
      console.log(`Dashboard already running on port ${DASHBOARD_PORT} (external process)`);
    } else {
      console.log("Starting dashboard...");
      if (!existsSync(join(dashboardDir, ".next"))) {
        console.error(`  Error: Dashboard not built. Run 'mcp-pm setup' first.`);
        process.exit(1);
      }
      const proc = spawn("npx", [
        "--prefix", dashboardDir,
        "next", "start", "--port", String(DASHBOARD_PORT),
      ], { detached: true, stdio: "ignore" });
      proc.unref();
      if (proc.pid) {
        writeFileSync(pidFile, String(proc.pid));
        console.log(`  Dashboard started (PID: ${proc.pid}) on ${DASHBOARD_URL}`);
      }
    }
  }
}

export async function stop(): Promise<void> {
  ensurePidDir();
  const pidDir = getPidDir();
  let stopped = false;

  const services: Array<[string, string, number]> = [
    ["Backend", join(pidDir, "backend.pid"), BACKEND_PORT],
    ["Dashboard", join(pidDir, "dashboard.pid"), DASHBOARD_PORT],
  ];

  for (const [name, pidFile, port] of services) {
    const pid = readPid(pidFile);
    if (pid) {
      try {
        process.kill(pid, "SIGTERM");
        console.log(`  ${name} stopped (PID: ${pid})`);
        stopped = true;
        try { unlinkSync(pidFile); } catch { /* ignore */ }
      } catch {
        console.log(`  Failed to stop ${name} (PID: ${pid})`);
      }
    } else {
      // Fallback: find by port
      try {
        const portPid = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null | head -1`, { encoding: "utf-8" }).trim();
        if (portPid) {
          process.kill(parseInt(portPid, 10), "SIGTERM");
          console.log(`  ${name} stopped (port ${port}, PID: ${portPid})`);
          stopped = true;
        }
      } catch { /* not running */ }
    }
  }

  if (!stopped) {
    console.log("No running services found.");
  }
}

export async function status(): Promise<void> {
  ensurePidDir();
  const pidDir = getPidDir();
  const projectDir = process.cwd();
  const settingsPath = join(projectDir, ".claude", "settings.local.json");
  const dbFile = join(homedir(), ".mcp-pm", "mcp_pm.db");

  console.log("\n\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m");
  console.log("\x1b[34m  MCP ProjectManager Status\x1b[0m");
  console.log("\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n");

  // Services
  console.log("\x1b[34mServices:\x1b[0m");

  // Backend
  if (isPortListening(BACKEND_PORT)) {
    if (isHealthy(`${BACKEND_URL}/api/dashboard/overview`)) {
      const pid = readPid(join(pidDir, "backend.pid"));
      console.log(`  \x1b[32m●\x1b[0m Backend    : running on port ${BACKEND_PORT}${pid ? ` (pid ${pid})` : ""}`);
    } else {
      console.log(`  \x1b[33m●\x1b[0m Backend    : port ${BACKEND_PORT} occupied but not healthy`);
    }
  } else {
    console.log(`  \x1b[31m●\x1b[0m Backend    : not running (port ${BACKEND_PORT})`);
  }

  // Dashboard
  if (isPortListening(DASHBOARD_PORT)) {
    if (isHealthy(DASHBOARD_URL)) {
      const pid = readPid(join(pidDir, "dashboard.pid"));
      console.log(`  \x1b[32m●\x1b[0m Dashboard  : running on port ${DASHBOARD_PORT}${pid ? ` (pid ${pid})` : ""}`);
    } else {
      console.log(`  \x1b[33m●\x1b[0m Dashboard  : port ${DASHBOARD_PORT} occupied but not responding`);
    }
  } else {
    console.log(`  \x1b[31m●\x1b[0m Dashboard  : not running (port ${DASHBOARD_PORT})`);
  }

  console.log();

  // Database
  console.log("\x1b[34mDatabase:\x1b[0m");
  if (existsSync(dbFile)) {
    try {
      const sizeOutput = execSync(`du -h "${dbFile}" | cut -f1`, { encoding: "utf-8" }).trim();
      console.log(`  \x1b[32m●\x1b[0m SQLite DB  : ${dbFile} (${sizeOutput})`);

      try {
        const projects = execSync(`sqlite3 "${dbFile}" "SELECT COUNT(*) FROM projects;" 2>/dev/null`, { encoding: "utf-8" }).trim();
        const tasks = execSync(`sqlite3 "${dbFile}" "SELECT COUNT(*) FROM tasks;" 2>/dev/null`, { encoding: "utf-8" }).trim();
        const sessions = execSync(`sqlite3 "${dbFile}" "SELECT COUNT(*) FROM sessions;" 2>/dev/null`, { encoding: "utf-8" }).trim();
        const events = execSync(`sqlite3 "${dbFile}" "SELECT COUNT(*) FROM events;" 2>/dev/null`, { encoding: "utf-8" }).trim();
        console.log(`  \x1b[2m  Records  : ${projects} projects, ${tasks} tasks, ${sessions} sessions, ${events} events\x1b[0m`);
      } catch { /* sqlite3 not available */ }
    } catch {
      console.log(`  \x1b[32m●\x1b[0m SQLite DB  : ${dbFile}`);
    }
  } else {
    console.log(`  \x1b[31m●\x1b[0m SQLite DB  : not found at ${dbFile}`);
  }

  console.log();

  // Build Status
  console.log("\x1b[34mBuild Status:\x1b[0m");
  try {
    const monorepoRoot = getMonorepoRoot();
    const mcpServerBuilt = existsSync(join(monorepoRoot, "packages", "mcp-server", "dist"));
    const dashboardBuilt = existsSync(join(monorepoRoot, "packages", "dashboard", ".next"));
    const backendVenv = existsSync(join(monorepoRoot, "packages", "backend", ".venv"));

    console.log(`  ${mcpServerBuilt ? "\x1b[32m●" : "\x1b[31m●"}\x1b[0m MCP Server : ${mcpServerBuilt ? "built" : "not built"}`);
    console.log(`  ${dashboardBuilt ? "\x1b[32m●" : "\x1b[31m●"}\x1b[0m Dashboard  : ${dashboardBuilt ? "built" : "not built"}`);
    console.log(`  ${backendVenv ? "\x1b[32m●" : "\x1b[31m●"}\x1b[0m Backend    : ${backendVenv ? "venv exists" : "venv missing"}`);
  } catch {
    console.log("  \x1b[33m●\x1b[0m Could not determine monorepo location");
  }

  console.log();

  // Current Project Configuration
  console.log(`\x1b[34mCurrent Project (${basename(projectDir)}):\x1b[0m`);
  console.log(`  \x1b[2mPath: ${projectDir}\x1b[0m`);

  if (existsSync(settingsPath)) {
    try {
      const settings = JSON.parse(readFileSync(settingsPath, "utf-8"));

      // MCP server check
      const hasMcp = settings.mcpServers?.["mcp-project-manager"];
      console.log(`  ${hasMcp ? "\x1b[32m●" : "\x1b[31m●"}\x1b[0m MCP Server : ${hasMcp ? "registered" : "not registered"}`);

      // Hook check
      const hooks = settings.hooks || {};
      let hookCount = 0;
      for (const handlers of Object.values(hooks) as any[][]) {
        if (handlers.some((h: any) => h.command?.includes(`${BACKEND_PORT}/api/`))) hookCount++;
      }
      if (hookCount === 8) {
        console.log(`  \x1b[32m●\x1b[0m Hooks      : all 8 installed`);
      } else if (hookCount > 0) {
        console.log(`  \x1b[33m●\x1b[0m Hooks      : ${hookCount}/8 installed`);
      } else {
        console.log(`  \x1b[31m●\x1b[0m Hooks      : not installed`);
      }
    } catch {
      console.log("  \x1b[33m●\x1b[0m Settings   : failed to parse");
    }
  } else {
    console.log(`  \x1b[31m●\x1b[0m Settings   : no .claude/settings.local.json`);
  }

  console.log();
}
