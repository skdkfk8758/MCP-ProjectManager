export type ProjectStatus = "active" | "completed" | "archived";
export type TaskStatus = "todo" | "in_progress" | "done" | "archived";
export type TaskPriority = "low" | "medium" | "high" | "critical";
export type MilestoneStatus = "pending" | "in_progress" | "completed" | "overdue";

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
