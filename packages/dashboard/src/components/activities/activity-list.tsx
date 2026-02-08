"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, type ActivityEvent } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight } from "lucide-react";

const EVENT_TYPES = [
  "task_start", "task_end", "agent_spawn", "agent_complete",
  "tool_call", "error", "session_start", "session_end",
  "prompt", "file_change", "commit", "skill_call",
];

const eventTypeColors: Record<string, string> = {
  task_start: "bg-blue-500",
  task_end: "bg-green-500",
  agent_spawn: "bg-purple-500",
  agent_complete: "bg-purple-300",
  tool_call: "bg-orange-500",
  error: "bg-red-500",
  session_start: "bg-cyan-500",
  session_end: "bg-cyan-300",
  prompt: "bg-yellow-500",
  file_change: "bg-pink-500",
  commit: "bg-emerald-500",
  skill_call: "bg-indigo-500",
};

export function ActivityList() {
  const [eventType, setEventType] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const limit = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["activities", eventType, offset],
    queryFn: () => api.dashboard.activities({
      event_type: eventType || undefined,
      limit,
      offset,
    }),
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div>
      {/* Filter Bar */}
      <div className="flex items-center gap-3 mb-4">
        <select
          value={eventType}
          onChange={(e) => { setEventType(e.target.value); setOffset(0); }}
          className="rounded-md border border-border bg-card px-3 py-1.5 text-sm"
        >
          <option value="">모든 이벤트</option>
          {EVENT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        {data && (
          <span className="text-sm text-muted-foreground">
            총 {data.total}개
          </span>
        )}
      </div>

      {/* Activity List */}
      <div className="space-y-1">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">로딩 중...</div>
        ) : data?.items.length ? (
          data.items.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))
        ) : (
          <div className="text-center py-12 text-muted-foreground">활동이 없습니다</div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setOffset(Math.max(0, offset - limit))}
            disabled={offset === 0}
            className="px-3 py-1.5 rounded-md border border-border text-sm disabled:opacity-40 hover:bg-card"
          >
            이전
          </button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setOffset(offset + limit)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1.5 rounded-md border border-border text-sm disabled:opacity-40 hover:bg-card"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}

function ActivityRow({ activity }: { activity: ActivityEvent }) {
  const [expanded, setExpanded] = useState(false);
  const dotColor = eventTypeColors[activity.type] || "bg-gray-500";

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-muted/50 transition-colors"
      >
        <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
        <span className="font-medium min-w-[140px]">{activity.type}</span>
        {activity.session_name && (
          <span className="text-xs text-muted-foreground truncate">
            {activity.session_name}
          </span>
        )}
        <span className="ml-auto text-xs text-muted-foreground whitespace-nowrap">
          {activity.timestamp
            ? formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })
            : ""}
        </span>
        {activity.payload && (
          expanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
        )}
      </button>
      {expanded && activity.payload && (
        <div className="px-4 pb-3 pt-0">
          <pre className="text-xs bg-muted/50 rounded-md p-3 overflow-x-auto max-h-60">
            {JSON.stringify(activity.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
