"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const COLORS = [
  "#6366f1",
  "#22c55e",
  "#f97316",
  "#06b6d4",
  "#ec4899",
  "#eab308",
  "#8b5cf6",
  "#14b8a6",
];

interface AgentDistributionChartProps {
  data?: Array<{ agent_type: string; total_calls: number }>;
}

export function AgentDistributionChart({ data }: AgentDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
        No agent data available
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.agent_type,
    value: d.total_calls,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "#0a0a0f",
            border: "1px solid #27272a",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "#fafafa" }}
        />
        <Legend
          formatter={(value) => (
            <span style={{ color: "#a1a1aa", fontSize: "12px" }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
