"use client";

import { use, useState, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, type DashboardOverview, type ActivityEvent } from "@/lib/api";
import { ArrowLeft, ZoomIn, ZoomOut } from "lucide-react";
import Link from "next/link";

const EVENT_COLORS: Record<string, string> = {
  session_start: "#06b6d4",
  session_end: "#06b6d4",
  task_start: "#6366f1",
  task_end: "#6366f1",
  agent_spawn: "#8b5cf6",
  agent_complete: "#8b5cf6",
  tool_call: "#f97316",
  skill_call: "#22c55e",
  error: "#ef4444",
  prompt: "#eab308",
  file_change: "#14b8a6",
  commit: "#ec4899",
};

interface TimelineViewProps {
  paramsPromise: Promise<{ id: string }>;
}

export function TimelineView({ paramsPromise }: TimelineViewProps) {
  const params = use(paramsPromise);
  const projectId = params.id;
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);

  const { data: overview } = useQuery<DashboardOverview>({
    queryKey: ["dashboard", "overview"],
    queryFn: () => apiFetch<DashboardOverview>("/api/dashboard/overview"),
  });

  const events: ActivityEvent[] = useMemo(() => {
    return (overview?.recent_activity || [])
      .filter((e) => e.timestamp)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }, [overview]);

  const timeRange = useMemo(() => {
    if (events.length === 0)
      return { start: Date.now() - 3600000, end: Date.now() };
    const times = events.map((e) => new Date(e.timestamp).getTime());
    const min = Math.min(...times);
    const max = Math.max(...times);
    const padding = (max - min) * 0.1 || 3600000;
    return { start: min - padding, end: max + padding };
  }, [events]);

  const width = 1200;
  const height = Math.max(400, events.length * 30 + 100);
  const marginLeft = 120;
  const marginTop = 40;

  const xScale = (time: number) => {
    const ratio = (time - timeRange.start) / (timeRange.end - timeRange.start);
    return marginLeft + ratio * (width - marginLeft - 40) * zoom + panX;
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  };

  const ticks = useMemo(() => {
    const range = timeRange.end - timeRange.start;
    const tickCount = 8;
    const step = range / tickCount;
    return Array.from(
      { length: tickCount + 1 },
      (_, i) => timeRange.start + i * step
    );
  }, [timeRange]);

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        <Link
          href={`/projects/${projectId}`}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Timeline</h1>
        <div className="ml-auto flex gap-2">
          <button
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(z * 1.5, 5))}
            className="p-1.5 rounded-md bg-card border border-border text-muted-foreground hover:text-foreground"
          >
            <ZoomIn className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(z / 1.5, 0.5))}
            className="p-1.5 rounded-md bg-card border border-border text-muted-foreground hover:text-foreground"
          >
            <ZoomOut className="w-4 h-4" aria-hidden="true" />
          </button>
          <button
            aria-label="Reset zoom"
            onClick={() => {
              setZoom(1);
              setPanX(0);
            }}
            className="px-3 py-1 text-xs rounded-md bg-card border border-border text-muted-foreground hover:text-foreground"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-auto">
        {events.length === 0 ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No events to display
          </div>
        ) : (
          <svg
            ref={svgRef}
            role="img"
            aria-label="Event timeline chart"
            width={width * zoom}
            height={height}
            className="select-none"
          >
            {/* Time axis */}
            <line
              x1={marginLeft}
              y1={marginTop - 10}
              x2={width * zoom - 40}
              y2={marginTop - 10}
              stroke="#27272a"
            />
            {ticks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={xScale(tick)}
                  y1={marginTop - 15}
                  x2={xScale(tick)}
                  y2={height}
                  stroke="#27272a"
                  strokeDasharray="2,4"
                />
                <text
                  x={xScale(tick)}
                  y={marginTop - 20}
                  fill="#a1a1aa"
                  fontSize="11"
                  textAnchor="middle"
                >
                  {formatTime(tick)}
                </text>
              </g>
            ))}

            {/* Event bars */}
            {events.map((event, i) => {
              const y = marginTop + i * 28;
              const x = xScale(new Date(event.timestamp).getTime());
              const color = EVENT_COLORS[event.type] || "#71717a";

              return (
                <g key={event.id || i}>
                  {/* Event label */}
                  <text
                    x={marginLeft - 8}
                    y={y + 12}
                    fill="#a1a1aa"
                    fontSize="11"
                    textAnchor="end"
                  >
                    {event.type.replace(/_/g, " ")}
                  </text>
                  {/* Event bar */}
                  <rect
                    x={x}
                    y={y}
                    width={Math.max(8, 20 * zoom)}
                    height={18}
                    rx={4}
                    fill={color}
                    opacity={0.8}
                  />
                  {/* Hover area */}
                  <title>
                    {`${event.type} at ${new Date(event.timestamp).toLocaleTimeString()}`}
                  </title>
                </g>
              );
            })}

            {/* Legend */}
            {Object.entries(EVENT_COLORS)
              .slice(0, 6)
              .map(([type, color], i) => (
                <g
                  key={type}
                  transform={`translate(${marginLeft + i * 130}, ${height - 25})`}
                >
                  <rect width={10} height={10} rx={2} fill={color} />
                  <text x={14} y={9} fill="#a1a1aa" fontSize="10">
                    {type.replace(/_/g, " ")}
                  </text>
                </g>
              ))}
          </svg>
        )}
      </div>
    </div>
  );
}
