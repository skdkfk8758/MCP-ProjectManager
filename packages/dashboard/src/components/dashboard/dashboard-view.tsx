"use client";

import { useQuery } from "@tanstack/react-query";
import { api, type Project, type DashboardOverview, type ActivityEvent } from "@/lib/api";
import {
  Activity,
  FolderKanban,
  CheckCircle2,
  Clock,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CreateProjectButton } from "./create-project-dialog";

export function DashboardView() {
  const { data: overview } = useQuery<DashboardOverview>({
    queryKey: ["dashboard", "overview"],
    queryFn: () => api.dashboard.overview(),
  });

  const { data: projects } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => api.projects.list(),
  });

  const kpis = [
    {
      label: "프로젝트",
      value: overview?.total_projects ?? 0,
      icon: FolderKanban,
      color: "text-blue-400",
    },
    {
      label: "활성 작업",
      value: overview?.active_tasks ?? 0,
      icon: Activity,
      color: "text-yellow-400",
    },
    {
      label: "완료율",
      value: `${overview?.completion_rate ?? 0}%`,
      icon: CheckCircle2,
      color: "text-green-400",
    },
    {
      label: "오늘 세션",
      value: overview?.today_sessions ?? 0,
      icon: Clock,
      color: "text-purple-400",
    },
    {
      label: "토큰 사용량",
      value: formatNumber(overview?.total_tokens_used ?? 0),
      icon: Zap,
      color: "text-orange-400",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">대시보드</h1>

      {/* KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-lg border border-border bg-card p-4"
          >
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              <span className="text-sm text-muted-foreground">
                {kpi.label}
              </span>
            </div>
            <p className="text-2xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Project Grid */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">프로젝트</h2>
        <CreateProjectButton />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {projects?.map((project) => (
          <Link key={project.id} href={`/projects/${project.id}`}>
            <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium truncate">{project.name}</h3>
                <StatusBadge status={project.status} />
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {project.description || "설명 없음"}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  {project.completed_task_count ?? 0}/{project.task_count ?? 0} 작업
                </span>
                <span>
                  {(project.task_count ?? 0) > 0
                    ? Math.round(
                        ((project.completed_task_count ?? 0) / (project.task_count ?? 0)) * 100
                      )
                    : 0}
                  % 완료
                </span>
              </div>
              {(project.task_count ?? 0) > 0 && (
                <div
                  role="progressbar"
                  aria-valuenow={(project.task_count ?? 0) > 0 ? Math.round(((project.completed_task_count ?? 0) / (project.task_count ?? 0)) * 100) : 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Project progress: ${project.completed_task_count ?? 0} of ${project.task_count ?? 0} tasks completed`}
                  className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${
                        (project.task_count ?? 0) > 0
                          ? ((project.completed_task_count ?? 0) /
                              (project.task_count ?? 0)) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              )}
            </div>
          </Link>
        ))}
        {(!projects || projects.length === 0) && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            아직 프로젝트가 없습니다. 새 프로젝트를 만들어 시작하세요.
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <h2 className="text-lg font-semibold mb-4">최근 활동</h2>
      <div className="space-y-2">
        {overview?.recent_activity?.length ? (
          overview.recent_activity.slice(0, 10).map((activity: ActivityEvent, i: number) => (
            <div
              key={activity.id ?? i}
              className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2 text-sm"
            >
              <EventTypeBadge type={activity.type} />
              <span className="flex-1 truncate">{activity.type}</span>
              <span className="text-xs text-muted-foreground">
                {activity.timestamp
                  ? formatDistanceToNow(new Date(activity.timestamp), {
                      addSuffix: true,
                    })
                  : ""}
              </span>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            최근 활동이 없습니다
          </div>
        )}
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-500/10 text-green-400",
    completed: "bg-blue-500/10 text-blue-400",
    archived: "bg-gray-500/10 text-gray-400",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-xs ${colors[status] || colors.active}`}
    >
      {status}
    </span>
  );
}

function EventTypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    task_start: "bg-blue-500",
    task_end: "bg-green-500",
    agent_spawn: "bg-purple-500",
    agent_complete: "bg-purple-300",
    tool_call: "bg-orange-500",
    error: "bg-red-500",
    session_start: "bg-cyan-500",
    prompt: "bg-yellow-500",
  };
  return (
    <div className={`w-2 h-2 rounded-full ${colors[type] || "bg-gray-500"}`} />
  );
}
