#!/usr/bin/env node

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, symlinkSync, lstatSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

// ============================================================================
// Configuration — Update REPO_URL to your GitHub repository before publishing
// ============================================================================
const REPO_URL = "https://github.com/skdkfk8758/MCP-ProjectManager.git";
const BASE_DIR = join(homedir(), ".mcp-pm");
const INSTALL_DIR = join(BASE_DIR, "MCP_ProjectManager");
const CLI_PATH = join(INSTALL_DIR, "packages", "cli", "dist", "index.js");

// Colors
const BLUE = "\x1b[34m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const NC = "\x1b[0m";

function log(msg: string) { console.log(`${BLUE}[MCP-PM]${NC} ${msg}`); }
function ok(msg: string)  { console.log(`${GREEN}[  OK  ]${NC} ${msg}`); }
function warn(msg: string){ console.log(`${YELLOW}[ WARN ]${NC} ${msg}`); }
function fail(msg: string): never { console.error(`${RED}[FAIL  ]${NC} ${msg}`); process.exit(1); }

function run(cmd: string, opts: { cwd?: string; silent?: boolean } = {}): string {
  try {
    return execSync(cmd, {
      encoding: "utf-8",
      cwd: opts.cwd,
      stdio: opts.silent ? "pipe" : "inherit",
      timeout: 300_000, // 5 min
    }) || "";
  } catch (e: any) {
    if (opts.silent) return e.stdout || "";
    throw e;
  }
}

function cmdExists(cmd: string): boolean {
  try {
    execSync(`command -v ${cmd}`, { encoding: "utf-8", stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

function getVersion(cmd: string): string {
  try {
    return execSync(`${cmd} --version`, { encoding: "utf-8", stdio: "pipe" }).trim();
  } catch {
    return "";
  }
}

async function main() {
  console.log(`
${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
${BLUE}  create-mcp-pm — MCP Project Manager Bootstrap${NC}
${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}
`);

  const projectDir = process.cwd();
  const projectName = projectDir.split("/").pop() || "unknown";

  // ================================================================
  // Step 1: Pre-flight checks
  // ================================================================
  log("Step 1/5: Pre-flight checks...");

  // git
  if (!cmdExists("git")) fail("git not found. Please install git.");
  ok("git available");

  // Node.js 18+
  const nodeVer = process.version;
  const nodeMajor = parseInt(nodeVer.replace("v", "").split(".")[0], 10);
  if (nodeMajor < 18) fail(`Node.js 18+ required (found ${nodeVer})`);
  ok(`Node.js ${nodeVer}`);

  // Python 3.11+
  if (!cmdExists("python3")) fail("Python 3 not found. Install Python 3.11+.");
  try {
    const pyVer = execSync(
      'python3 -c "import sys; print(f\\"{sys.version_info.major}.{sys.version_info.minor}\\")"',
      { encoding: "utf-8", stdio: "pipe" },
    ).trim();
    const [pyMajor, pyMinor] = pyVer.split(".").map(Number);
    if (pyMajor < 3 || (pyMajor === 3 && pyMinor < 11)) {
      fail(`Python 3.11+ required (found ${pyVer})`);
    }
    ok(`Python ${pyVer}`);
  } catch {
    fail("Failed to check Python version");
  }

  // ================================================================
  // Step 2: Ensure pnpm is available
  // ================================================================
  log("Step 2/5: Ensuring pnpm...");

  if (!cmdExists("pnpm")) {
    log("pnpm not found. Installing via corepack...");
    try {
      run("corepack enable", { silent: true });
      run("corepack prepare pnpm@latest --activate", { silent: true });
      ok("pnpm installed via corepack");
    } catch {
      log("corepack failed. Installing pnpm via npm...");
      try {
        run("npm install -g pnpm", { silent: true });
        ok("pnpm installed via npm");
      } catch {
        fail("Failed to install pnpm. Please install manually: https://pnpm.io/installation");
      }
    }
  } else {
    ok(`pnpm ${getVersion("pnpm").replace("pnpm ", "")}`);
  }

  // ================================================================
  // Step 3: Clone or update repository
  // ================================================================
  log("Step 3/5: Getting MCP ProjectManager...");

  mkdirSync(BASE_DIR, { recursive: true });

  if (existsSync(join(INSTALL_DIR, "package.json"))) {
    // Repo exists — pull latest
    log("Repository found. Pulling latest...");
    try {
      run("git pull --ff-only", { cwd: INSTALL_DIR, silent: true });
      ok("Repository updated");
    } catch {
      warn("git pull failed (maybe on a different branch). Using existing version.");
    }
  } else {
    // Fresh clone
    log(`Cloning from ${REPO_URL}...`);
    let cloneSuccess = false;
    try {
      run(`git clone "${REPO_URL}" "${INSTALL_DIR}"`);
      ok("Repository cloned");
      cloneSuccess = true;
    } catch {
      warn(`Clone failed. Trying local monorepo fallback...`);
    }

    // Fallback: if this script is running from within the monorepo, symlink it
    if (!cloneSuccess) {
      const thisFile = fileURLToPath(import.meta.url);
      // dist/index.js → packages/create-mcp-pm/dist → up 3 levels → monorepo root
      const localMonorepo = join(dirname(thisFile), "..", "..", "..");
      if (existsSync(join(localMonorepo, "package.json")) && existsSync(join(localMonorepo, "packages", "cli"))) {
        log(`Linking local monorepo: ${localMonorepo}`);
        symlinkSync(localMonorepo, INSTALL_DIR, "dir");
        ok("Local monorepo linked");
      } else {
        fail(`Failed to clone from ${REPO_URL} and no local monorepo found.\nPush your repo to GitHub first, or run from within the monorepo.`);
      }
    }
  }

  // ================================================================
  // Step 4: Install dependencies and build
  // ================================================================
  log("Step 4/5: Installing dependencies and building...");

  // pnpm install
  log("Running pnpm install...");
  try {
    const lockfileExists = existsSync(join(INSTALL_DIR, "pnpm-lock.yaml"));
    const installCmd = lockfileExists ? "pnpm install --frozen-lockfile" : "pnpm install";
    run(installCmd, { cwd: INSTALL_DIR });
    ok("Dependencies installed");
  } catch {
    // Retry without frozen lockfile
    log("Retrying pnpm install without frozen lockfile...");
    run("pnpm install", { cwd: INSTALL_DIR });
    ok("Dependencies installed");
  }

  // Build MCP Server (needed for MCP registration)
  const mcpServerDist = join(INSTALL_DIR, "packages", "mcp-server", "dist");
  if (!existsSync(mcpServerDist)) {
    log("Building MCP Server...");
    run("pnpm build", { cwd: join(INSTALL_DIR, "packages", "mcp-server") });
    ok("MCP Server built");
  } else {
    ok("MCP Server already built");
  }

  // Build CLI (needed for setup command)
  const cliDist = join(INSTALL_DIR, "packages", "cli", "dist");
  if (!existsSync(cliDist)) {
    log("Building CLI...");
    run("pnpm build", { cwd: join(INSTALL_DIR, "packages", "cli") });
    ok("CLI built");
  } else {
    ok("CLI already built");
  }

  // Build Dashboard
  const dashboardNext = join(INSTALL_DIR, "packages", "dashboard", ".next");
  if (!existsSync(dashboardNext)) {
    log("Building Dashboard (this may take a minute)...");
    run("pnpm build", { cwd: join(INSTALL_DIR, "packages", "dashboard") });
    ok("Dashboard built");
  } else {
    ok("Dashboard already built");
  }

  // Backend venv
  const backendVenv = join(INSTALL_DIR, "packages", "backend", ".venv");
  if (!existsSync(backendVenv)) {
    log("Setting up Python backend...");
    const backendDir = join(INSTALL_DIR, "packages", "backend");
    try {
      run('python3 -m venv .venv && .venv/bin/pip install -e ".[dev]"', { cwd: backendDir });
    } catch {
      run("python3 -m venv .venv && .venv/bin/pip install -e .", { cwd: backendDir });
    }
    ok("Python backend ready");
  } else {
    ok("Python backend already set up");
  }

  // ================================================================
  // Step 5: Run setup for current project
  // ================================================================
  log(`Step 5/5: Setting up MCP PM for '${projectName}'...`);

  if (!existsSync(CLI_PATH)) {
    fail(`CLI not found at ${CLI_PATH}. Build may have failed.`);
  }

  // Run the CLI's setup command in the context of the user's current project
  try {
    run(`node "${CLI_PATH}" setup`, { cwd: projectDir });
  } catch {
    fail("Setup command failed. Check the output above for details.");
  }

  // Final tip
  console.log(`
${DIM}Tip: For convenience, you can install the CLI globally:${NC}
${DIM}  cd ${INSTALL_DIR}/packages/cli && npm link${NC}
${DIM}  Then use: mcp-pm status / mcp-pm teardown / mcp-pm setup${NC}

${DIM}To set up another project, just run:${NC}
${DIM}  cd ~/other-project && npx create-mcp-pm${NC}
`);
}

main().catch((err) => {
  console.error(`\n${RED}Unexpected error:${NC}`, err.message);
  process.exit(1);
});
