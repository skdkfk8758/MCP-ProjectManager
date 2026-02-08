import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { homedir } from "node:os";

/**
 * CLI 바이너리 위치에서 monorepo 루트를 역산.
 * dist/index.js → packages/cli/dist/index.js → ../../.. → monorepo root
 */
export function getMonorepoRoot(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // In bundled output: packages/cli/dist/index.js → go up 3 levels
  const root = resolve(dirname(thisFile), "..", "..", "..");
  if (!existsSync(join(root, "package.json"))) {
    throw new Error(`Monorepo root not found at ${root}. Are you running from the correct location?`);
  }
  return root;
}

export function getBackendDir(): string {
  return join(getMonorepoRoot(), "packages", "backend");
}

export function getMcpServerDist(): string {
  return join(getMonorepoRoot(), "packages", "mcp-server", "dist", "index.js");
}

export function getDashboardDir(): string {
  return join(getMonorepoRoot(), "packages", "dashboard");
}

export function getPidDir(): string {
  return join(homedir(), ".mcp-pm", "pids");
}

export function getDataDir(): string {
  return join(homedir(), ".mcp-pm");
}

export const BACKEND_PORT = 48293;
export const DASHBOARD_PORT = 48294;
export const BACKEND_URL = `http://localhost:${BACKEND_PORT}`;
export const DASHBOARD_URL = `http://localhost:${DASHBOARD_PORT}`;
