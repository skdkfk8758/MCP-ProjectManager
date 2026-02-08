"use client";

interface AgentPerformanceTableProps {
  data?: Array<{
    agent_type: string;
    model: string;
    total_calls: number;
    avg_duration_ms: number;
    success_rate: number;
  }>;
}

export function AgentPerformanceTable({ data }: AgentPerformanceTableProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
        에이전트 성능 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">
              에이전트
            </th>
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">
              모델
            </th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">
              호출
            </th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">
              평균 소요시간
            </th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium">
              성공률
            </th>
          </tr>
        </thead>
        <tbody>
          {data
            .sort((a, b) => b.total_calls - a.total_calls)
            .map((agent, i) => (
              <tr
                key={i}
                className="border-b border-border/50 hover:bg-muted/30"
              >
                <td className="py-2 px-3 font-medium">{agent.agent_type}</td>
                <td className="py-2 px-3">
                  <span className="px-2 py-0.5 rounded text-xs bg-muted">
                    {agent.model}
                  </span>
                </td>
                <td className="py-2 px-3 text-right">{agent.total_calls}</td>
                <td className="py-2 px-3 text-right">
                  {formatDuration(agent.avg_duration_ms)}
                </td>
                <td className="py-2 px-3 text-right">
                  <span
                    className={
                      agent.success_rate >= 90
                        ? "text-green-400"
                        : agent.success_rate >= 70
                          ? "text-yellow-400"
                          : "text-red-400"
                    }
                  >
                    {Math.round(agent.success_rate)}%
                  </span>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}
