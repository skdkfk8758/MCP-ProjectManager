import { execSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, basename } from "node:path";
import {
  getMonorepoRoot,
  getBackendDir,
  getMcpServerDist,
  getDashboardDir,
  getPidDir,
  getDataDir,
  BACKEND_PORT,
  DASHBOARD_PORT,
  BACKEND_URL,
  DASHBOARD_URL,
} from "../utils.js";

function log(msg: string) { console.log(`\x1b[34m[MCP-PM]\x1b[0m ${msg}`); }
function ok(msg: string)  { console.log(`\x1b[32m[  OK  ]\x1b[0m ${msg}`); }
function warn(msg: string){ console.log(`\x1b[33m[ WARN ]\x1b[0m ${msg}`); }
function fail(msg: string): never { console.error(`\x1b[31m[FAIL  ]\x1b[0m ${msg}`); process.exit(1); }

function isPortInUse(port: number): { inUse: boolean; pid?: string } {
  try {
    const pid = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null | head -1`, { encoding: "utf-8" }).trim();
    if (pid) return { inUse: true, pid };
  } catch { /* port free */ }
  return { inUse: false };
}

function waitForHealth(url: string, maxSeconds: number): boolean {
  for (let i = 0; i < maxSeconds; i++) {
    try {
      execSync(`curl -sf "${url}" >/dev/null 2>&1`, { timeout: 3000 });
      return true;
    } catch { /* retry */ }
    execSync("sleep 1");
  }
  return false;
}

export async function setup(): Promise<void> {
  const monorepoRoot = getMonorepoRoot();
  const backendDir = getBackendDir();
  const dashboardDir = getDashboardDir();
  const mcpServerDist = getMcpServerDist();
  const pidDir = getPidDir();
  const projectDir = process.cwd();
  const projectName = basename(projectDir);
  const claudeDir = join(projectDir, ".claude");
  const settingsPath = join(claudeDir, "settings.local.json");

  console.log("\n\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m");
  console.log("\x1b[34m  MCP ProjectManager - Setup\x1b[0m");
  console.log("\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n");

  // ================================================================
  // Step 1: Pre-flight checks
  // ================================================================
  log("Step 1/7: Pre-flight checks...");

  // Node.js 18+
  try {
    const nodeVersion = execSync("node -v", { encoding: "utf-8" }).trim();
    const major = parseInt(nodeVersion.replace("v", "").split(".")[0], 10);
    if (major < 18) fail(`Node.js 18+ required (found ${nodeVersion})`);
    ok(`Node.js ${nodeVersion}`);
  } catch {
    fail("Node.js not found. Install Node.js 18+.");
  }

  // Python 3.11+
  try {
    const pyVer = execSync('python3 -c "import sys; print(f\\"{sys.version_info.major}.{sys.version_info.minor}\\")"', { encoding: "utf-8" }).trim();
    const [pyMajor, pyMinor] = pyVer.split(".").map(Number);
    if (pyMajor < 3 || (pyMajor === 3 && pyMinor < 11)) fail(`Python 3.11+ required (found ${pyVer})`);
    ok(`Python ${pyVer}`);
  } catch {
    fail("Python 3 not found. Install Python 3.11+.");
  }

  // Port availability
  let needBackend = true;
  let needDashboard = true;

  const backendPort = isPortInUse(BACKEND_PORT);
  if (backendPort.inUse) {
    warn(`Port ${BACKEND_PORT} already in use (pid ${backendPort.pid}) — reusing`);
    needBackend = false;
  }

  const dashboardPort = isPortInUse(DASHBOARD_PORT);
  if (dashboardPort.inUse) {
    warn(`Port ${DASHBOARD_PORT} already in use (pid ${dashboardPort.pid}) — reusing`);
    needDashboard = false;
  }

  ok(`Monorepo at ${monorepoRoot}`);

  // ================================================================
  // Step 2: Build (if needed)
  // ================================================================
  log("Step 2/7: Checking builds...");

  // MCP Server
  if (!existsSync(join(monorepoRoot, "packages", "mcp-server", "dist"))) {
    log("Building MCP Server...");
    execSync("npx tsup src/index.ts --format esm --dts --clean", {
      cwd: join(monorepoRoot, "packages", "mcp-server"),
      stdio: "inherit",
    });
    ok("MCP Server built");
  } else {
    ok("MCP Server already built");
  }

  // Dashboard
  if (!existsSync(join(dashboardDir, ".next"))) {
    log("Building Dashboard...");
    execSync("npx next build", { cwd: dashboardDir, stdio: "inherit" });
    ok("Dashboard built");
  } else {
    ok("Dashboard already built");
  }

  // Backend venv
  if (!existsSync(join(backendDir, ".venv"))) {
    log("Creating Python venv...");
    try {
      execSync('python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"', {
        cwd: backendDir,
        stdio: "inherit",
      });
    } catch {
      execSync("python3 -m venv .venv && .venv/bin/pip install -e .", {
        cwd: backendDir,
        stdio: "inherit",
      });
    }
    ok("Python venv created");
  } else {
    ok("Python venv exists");
  }

  // ================================================================
  // Step 3: Start services
  // ================================================================
  log("Step 3/7: Starting services...");

  mkdirSync(pidDir, { recursive: true });
  mkdirSync(getDataDir(), { recursive: true });

  // Backend
  if (needBackend) {
    log(`Starting Backend (port ${BACKEND_PORT})...`);
    const uvicornPath = join(backendDir, ".venv", "bin", "uvicorn");
    const proc = spawn(uvicornPath, [
      "app.main:app",
      "--host", "0.0.0.0",
      "--port", String(BACKEND_PORT),
      "--app-dir", backendDir,
    ], { detached: true, stdio: "ignore" });
    proc.unref();
    if (proc.pid) {
      writeFileSync(join(pidDir, "backend.pid"), String(proc.pid));
    }

    if (waitForHealth(`${BACKEND_URL}/api/dashboard/overview`, 15)) {
      ok(`Backend running (pid ${proc.pid})`);
    } else {
      fail("Backend failed to start within 15 seconds");
    }
  } else {
    ok(`Backend already running on port ${BACKEND_PORT}`);
  }

  // Dashboard
  if (needDashboard) {
    log(`Starting Dashboard (port ${DASHBOARD_PORT})...`);
    const proc = spawn("npx", [
      "--prefix", dashboardDir,
      "next", "start", "--port", String(DASHBOARD_PORT),
    ], { detached: true, stdio: "ignore" });
    proc.unref();
    if (proc.pid) {
      writeFileSync(join(pidDir, "dashboard.pid"), String(proc.pid));
    }

    if (waitForHealth(DASHBOARD_URL, 15)) {
      ok(`Dashboard running (pid ${proc.pid})`);
    } else {
      warn("Dashboard may still be starting up");
    }
  } else {
    ok(`Dashboard already running on port ${DASHBOARD_PORT}`);
  }

  // ================================================================
  // Step 4: Register MCP Server
  // ================================================================
  log("Step 4/7: Registering MCP Server...");

  if (!existsSync(mcpServerDist)) {
    fail(`MCP Server dist not found at ${mcpServerDist}`);
  }

  mkdirSync(claudeDir, { recursive: true });

  let settings: Record<string, any> = {};
  if (existsSync(settingsPath)) {
    try { settings = JSON.parse(readFileSync(settingsPath, "utf-8")); } catch { /* fresh */ }
  }

  const mcpServers = settings.mcpServers || {};
  mcpServers["mcp-project-manager"] = {
    command: "node",
    args: [mcpServerDist],
    env: { FASTAPI_BASE_URL: BACKEND_URL },
  };
  settings.mcpServers = mcpServers;
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  ok(`MCP Server registered in ${settingsPath}`);

  // ================================================================
  // Step 5: Install Hooks
  // ================================================================
  log("Step 5/7: Installing hooks...");

  // Re-read settings (just wrote MCP config)
  settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
  const hooks: Record<string, any[]> = settings.hooks || {};

  const hookDefs: Record<string, string> = {
    SessionStart: `node -e "const fs=require('fs');const crypto=require('crypto');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||crypto.randomUUID();fetch('${BACKEND_URL}/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:sid,project_id:null})}).catch(()=>{});fetch('${BACKEND_URL}/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'session_start',payload:{cwd:d.cwd||process.cwd(),start_time:new Date().toISOString()}})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
    SessionEnd: `node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||process.env.CLAUDE_SESSION_ID||'unknown';fetch('${BACKEND_URL}/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'session_end',payload:{end_time:new Date().toISOString()}})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
    PreToolUse: `node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||process.env.CLAUDE_SESSION_ID||'unknown';fetch('${BACKEND_URL}/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'tool_call',payload:{tool_name:d.tool_name||d.toolName,phase:'start',parameters:d.tool_input||d.input}})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
    PostToolUse: `node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||process.env.CLAUDE_SESSION_ID||'unknown';fetch('${BACKEND_URL}/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'tool_result',payload:{tool_name:d.tool_name||d.toolName,phase:'end',result_summary:d.tool_output?d.tool_output.substring(0,500):''}})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
    UserPromptSubmit: `node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||process.env.CLAUDE_SESSION_ID||'unknown';fetch('${BACKEND_URL}/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'user_prompt',payload:{prompt_length:d.prompt?d.prompt.length:0}})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
    SubagentStart: `node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||process.env.CLAUDE_SESSION_ID||'unknown';fetch('${BACKEND_URL}/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'subagent_start',payload:d})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
    SubagentStop: `node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||process.env.CLAUDE_SESSION_ID||'unknown';fetch('${BACKEND_URL}/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'subagent_stop',payload:d})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
    Stop: `node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||process.env.CLAUDE_SESSION_ID||'unknown';fetch('${BACKEND_URL}/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'stop',payload:{reason:d.reason||'unknown'}})}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
  };

  for (const [event, command] of Object.entries(hookDefs)) {
    const existing: any[] = hooks[event] || [];
    // Remove old mcp-pm hooks
    const filtered = existing.filter(
      (h: any) => !(h.command && h.command.includes(`${BACKEND_PORT}/api/`))
    );
    filtered.push({ type: "command", command });
    hooks[event] = filtered;
  }

  settings.hooks = hooks;
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  ok("8 hooks installed");

  // ================================================================
  // Step 6: Auto-register project
  // ================================================================
  log(`Step 6/7: Registering project '${projectName}'...`);

  try {
    const res = execSync(`curl -sf -X POST "${BACKEND_URL}/api/projects" -H "Content-Type: application/json" -d '${JSON.stringify({ name: projectName, description: "Auto-registered by MCP-PM setup", path: projectDir })}'`, {
      encoding: "utf-8",
      timeout: 5000,
    });
    const data = JSON.parse(res);
    if (data.id) {
      ok(`Project registered: ${projectName} (id: ${data.id})`);
    } else {
      warn("Project registration skipped (may already exist)");
    }
  } catch {
    warn("Project registration skipped (may already exist)");
  }

  // ================================================================
  // Step 7: Verification
  // ================================================================
  log("Step 7/7: Verification...");

  // Backend health
  if (waitForHealth(`${BACKEND_URL}/api/dashboard/overview`, 3)) {
    ok("Backend API healthy");
  } else {
    warn("Backend API not responding");
  }

  // Dashboard health
  if (waitForHealth(DASHBOARD_URL, 3)) {
    ok("Dashboard accessible");
  } else {
    warn("Dashboard not responding (may still be starting)");
  }

  // Settings verification
  if (existsSync(settingsPath)) {
    const finalSettings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    const hookCount = Object.keys(finalSettings.hooks || {}).length;
    const mcpCount = Object.keys(finalSettings.mcpServers || {}).length;
    ok(`Settings: ${mcpCount} MCP server(s), ${hookCount} hook event(s)`);
  }

  // Summary
  console.log("\n\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m");
  console.log("\x1b[32m  MCP ProjectManager Setup Complete!\x1b[0m");
  console.log("\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n");
  console.log(`  Project:    \x1b[34m${projectName}\x1b[0m`);
  console.log(`  Backend:    \x1b[34m${BACKEND_URL}\x1b[0m`);
  console.log(`  Dashboard:  \x1b[34m${DASHBOARD_URL}\x1b[0m`);
  console.log(`  Settings:   \x1b[34m${settingsPath}\x1b[0m`);
  console.log(`\n  \x1b[33mRestart Claude Code to load MCP server and hooks.\x1b[0m`);
  console.log(`\n  Other commands:`);
  console.log(`    Status:   \x1b[34mmcp-pm status\x1b[0m`);
  console.log(`    Teardown: \x1b[34mmcp-pm teardown\x1b[0m\n`);
}
