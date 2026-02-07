"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TaskCompletionChartProps {
  data?: { dates: string[]; tasks_completed: number[] };
}

export function TaskCompletionChart({ data }: TaskCompletionChartProps) {
  if (!data || data.dates.length === 0) {
    return <EmptyChart message="No task data available" />;
  }

  const chartData = data.dates.map((date, i) => ({
    date: formatDate(date),
    tasks: data.tasks_completed[i] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData}>
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
          itemStyle={{ color: "#6366f1" }}
        />
        <Line
          type="monotone"
          dataKey="tasks"
          stroke="#6366f1"
          strokeWidth={2}
          dot={{ fill: "#6366f1", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
      {message}
    </div>
  );
}
