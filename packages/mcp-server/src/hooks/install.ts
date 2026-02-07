import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

export function installHooks(projectDir: string): void {
  const claudeDir = join(projectDir, ".claude");
  const settingsPath = join(claudeDir, "settings.local.json");

  if (!existsSync(claudeDir)) {
    mkdirSync(claudeDir, { recursive: true });
  }

  let settings: Record<string, any> = {};
  if (existsSync(settingsPath)) {
    try {
      settings = JSON.parse(readFileSync(settingsPath, "utf-8"));
    } catch {}
  }

  const hooksDir = join(__dirname, "..", "hooks");

  const hookMappings: Record<string, string> = {
    PreToolUse: "pre-tool-use",
    PostToolUse: "post-tool-use",
    SessionStart: "session-start",
    SessionEnd: "session-end",
    SubagentStart: "subagent-start",
    SubagentStop: "subagent-stop",
    UserPromptSubmit: "user-prompt-submit",
    Stop: "stop",
  };

  const hooks = (settings.hooks || {}) as Record<string, any[]>;

  for (const [event, filename] of Object.entries(hookMappings)) {
    const existing = hooks[event] || [];
    const alreadyInstalled = existing.some(
      (h: any) => typeof h === "object" && h.command?.includes("mcp-pm")
    );
    if (!alreadyInstalled) {
      existing.push({
        type: "command",
        command: `npx @mcp-pm/server hooks/${filename}`,
      });
    }
    hooks[event] = existing;
  }

  settings.hooks = hooks;
  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}
