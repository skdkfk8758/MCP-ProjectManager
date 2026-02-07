export interface DashboardSummary {
  total_projects: number;
  active_tasks: number;
  completion_rate: number;
  today_sessions: number;
  total_tokens_used: number;
  recent_activity: ActivityItem[];
}

export interface ActivityItem {
  id: number;
  type: string;
  description: string;
  timestamp: string;
  project_id?: number;
}

export interface FlowGraphData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowNode {
  id: string;
  type: "agent" | "skill" | "tool" | "session";
  label: string;
  data: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  duration_ms?: number;
}

export interface TimelineData {
  sessions: TimelineSession[];
}

export interface TimelineSession {
  id: string;
  start_time: string;
  end_time?: string;
  events: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  type: string;
  start_time: string;
  end_time?: string;
  label: string;
  color: string;
}
