"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TokenUsageChartProps {
  data?: { dates: string[]; tokens_used: number[] };
}

export function TokenUsageChart({ data }: TokenUsageChartProps) {
  if (!data || data.dates.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">
        No token data available
      </div>
    );
  }

  const chartData = data.dates.map((date, i) => ({
    date: formatDate(date),
    tokens: data.tokens_used[i] || 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="date" stroke="#a1a1aa" fontSize={12} />
        <YAxis
          stroke="#a1a1aa"
          fontSize={12}
          tickFormatter={(v) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
          }
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "#0a0a0f",
            border: "1px solid #27272a",
            borderRadius: "8px",
          }}
          labelStyle={{ color: "#fafafa" }}
          formatter={(value: number) => [value.toLocaleString(), "Tokens"]}
        />
        <defs>
          <linearGradient id="tokenGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="tokens"
          stroke="#f97316"
          strokeWidth={2}
          fill="url(#tokenGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
