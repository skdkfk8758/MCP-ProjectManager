"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SessionStatsChartProps {
  data?: { dates: string[]; session_counts: number[] };
}

export function SessionStatsChart({ data }: SessionStatsChartProps) {
  if (!data || data.dates.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
        세션 데이터가 없습니다
      </div>
    );
  }

  const chartData = data.dates.map((date, i) => ({
    date: formatDate(date),
    sessions: data.session_counts[i] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
        <YAxis stroke="#a1a1aa" fontSize={12} />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0a0a0f",
            border: "1px solid #27272a",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "#fafafa" }}
          itemStyle={{ color: "#06b6d4" }}
        />
        <Bar dataKey="sessions" fill="#06b6d4" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
