const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:48293";

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export interface Project {
  id: number;
  name: string;
  description: string | null;
  status: string;
  path: string | null;
  created_at: string;
  updated_at: string;
  task_count?: number;
  completed_task_count?: number;
}

export interface TaskItem {
  id: number;
  project_id: number;
  milestone_id: number | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  sort_order: number;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardOverview {
  total_projects: number;
  active_tasks: number;
  completion_rate: number;
  today_sessions: number;
  total_tokens_used: number;
  recent_activity: ActivityEvent[];
}

export interface ActivityEvent {
  id?: number;
  type: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

export interface AgentStat {
  agent_type: string;
  model: string;
  total_calls: number;
  avg_duration_ms: number;
  success_rate: number;
  date?: string;
}

export interface TrendData {
  dates: string[];
  tasks_completed: number[];
  tokens_used: number[];
  session_count: number[];
}

export const api = {
  projects: {
    list: () => apiFetch<Project[]>("/api/projects"),
    get: (id: number) => apiFetch<Project>(`/api/projects/${id}`),
    create: (data: Partial<Project>) => apiFetch<Project>("/api/projects", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<Project>) => apiFetch<Project>(`/api/projects/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (id: number) => apiFetch<{ deleted: boolean }>(`/api/projects/${id}`, { method: "DELETE" }),
  },
  tasks: {
    list: (projectId?: number) => apiFetch<TaskItem[]>(projectId ? `/api/tasks?project_id=${projectId}` : "/api/tasks"),
    get: (id: number) => apiFetch<TaskItem>(`/api/tasks/${id}`),
    create: (data: Partial<TaskItem>) => apiFetch<TaskItem>("/api/tasks", { method: "POST", body: JSON.stringify(data) }),
    update: (id: number, data: Partial<TaskItem>) => apiFetch<TaskItem>(`/api/tasks/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    updateStatus: (id: number, status: string) => apiFetch<TaskItem>(`/api/tasks/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
    delete: (id: number) => apiFetch<{ deleted: boolean }>(`/api/tasks/${id}`, { method: "DELETE" }),
  },
  dashboard: {
    overview: () => apiFetch<DashboardOverview>("/api/dashboard/overview"),
    trends: (days?: number) => apiFetch<TrendData>(`/api/dashboard/trends?days=${days || 30}`),
    agentStats: (days?: number) => apiFetch<AgentStat[]>(`/api/dashboard/agent-stats?days=${days || 30}`),
  },
};
