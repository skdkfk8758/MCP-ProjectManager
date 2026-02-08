export type ProjectStatus = "active" | "completed" | "archived";
export type TaskStatus = "todo" | "in_progress" | "done" | "archived";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type MilestoneStatus = "pending" | "in_progress" | "completed" | "overdue";
export type TaskPhase = "design" | "implementation" | "review" | "testing";

export interface Project {
  id: number;
  name: string;
  description?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  project_id: number;
  milestone_id?: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  sort_order: number;
  due_date?: string;
  created_at: string;
  updated_at: string;
  labels?: Label[];
  dependencies?: number[];
  execution_mode?: "manual" | "ralph";
  phase?: "design" | "implementation" | "review" | "testing" | null;
}

export interface Milestone {
  id: number;
  project_id: number;
  title: string;
  description?: string;
  due_date?: string;
  status: MilestoneStatus;
  created_at: string;
}

export interface Label {
  id: number;
  name: string;
  color: string;
}

export interface SessionInfo {
  id: string;
  project_id?: number;
  name?: string;
  description?: string;
  start_time: string;
  end_time?: string;
  token_usage?: Record<string, unknown>;
  summary?: string;
  event_count?: number;
  active_task_count?: number;
}

export interface TaskExecution {
  id: number;
  task_id: number;
  session_id: string;
  started_at: string;
  stopped_at?: string;
  status: string;
  notes?: string;
  task_title?: string;
  ralph_state?: Record<string, unknown>;
  execution_mode?: string;
  ralph_context?: Record<string, unknown>;
}
