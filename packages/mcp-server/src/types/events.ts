export type FlowEventType =
  | "task_start"
  | "task_end"
  | "skill_call"
  | "tool_call"
  | "agent_spawn"
  | "agent_complete"
  | "session_start"
  | "session_end"
  | "error"
  | "file_change"
  | "commit"
  | "prompt";

export interface FlowEvent {
  id?: string;
  session_id: string;
  event_type: FlowEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface TaskStartPayload {
  task_name: string;
  description?: string;
  project_id?: number;
}

export interface TaskEndPayload {
  task_name: string;
  status: "completed" | "failed" | "cancelled";
  duration_ms?: number;
  error?: string;
}

export interface SkillCallPayload {
  skill_name: string;
  trigger: "auto" | "manual";
  parameters?: Record<string, unknown>;
}

export interface AgentSpawnPayload {
  agent_type: string;
  model: string;
  task_description?: string;
}

export interface AgentCompletePayload {
  agent_type: string;
  model: string;
  status: "completed" | "failed";
  duration_ms?: number;
  token_usage?: { input: number; output: number };
}

export interface ToolCallPayload {
  tool_name: string;
  parameters?: Record<string, unknown>;
  duration_ms?: number;
  success: boolean;
}

export interface FileChangePayload {
  file_path: string;
  change_type: "created" | "modified" | "deleted";
  lines_added?: number;
  lines_removed?: number;
}

export interface CommitPayload {
  hash: string;
  message: string;
  files_changed: number;
}

export interface ErrorPayload {
  error_type: string;
  message: string;
  stack_trace?: string;
  tool_name?: string;
}

export interface PromptPayload {
  prompt_text: string;
  token_count?: number;
}
