"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { TaskCompletionChart } from "@/components/analytics/task-completion-chart";
import { TokenUsageChart } from "@/components/analytics/token-usage-chart";
import { AgentDistributionChart } from "@/components/analytics/agent-distribution-chart";
import { SessionStatsChart } from "@/components/analytics/session-stats-chart";
import { AgentPerformanceTable } from "@/components/analytics/agent-performance-table";

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);

  const { data: trends } = useQuery({
    queryKey: ["analytics", "trends", days],
    queryFn: () => apiFetch<any>(`/api/dashboard/trends?days=${days}`),
  });

  const { data: agentStats } = useQuery({
    queryKey: ["analytics", "agent-stats", days],
    queryFn: () => apiFetch<any[]>(`/api/dashboard/agent-stats?days=${days}`),
  });

  const { data: overview } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () => apiFetch<any>("/api/dashboard/overview"),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <div className="flex gap-2">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                days === d
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Task Completion Trend">
          <TaskCompletionChart data={trends} />
        </ChartCard>
        <ChartCard title="Token Usage">
          <TokenUsageChart data={trends} />
        </ChartCard>
        <ChartCard title="Agent Distribution">
          <AgentDistributionChart data={agentStats} />
        </ChartCard>
        <ChartCard title="Session Activity">
          <SessionStatsChart data={trends} />
        </ChartCard>
      </div>

      <ChartCard title="Agent Performance">
        <AgentPerformanceTable data={agentStats} />
      </ChartCard>
    </div>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-medium text-muted-foreground mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}
