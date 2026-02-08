"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { Database, Trash2, RefreshCw, Server } from "lucide-react";

export default function SettingsPage() {
  const [cleanupResult, setCleanupResult] = useState<Record<string, number> | null>(null);

  const { data: health } = useQuery({
    queryKey: ["health"],
    queryFn: () => apiFetch<{ status: string }>("/health"),
    refetchInterval: 30000,
  });

  const { data: overview } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: () =>
      apiFetch<{
        total_projects: number;
        active_tasks: number;
        today_sessions: number;
      }>("/api/dashboard/overview"),
  });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">설정</h1>

      {/* Service Status */}
      <SettingsSection title="서비스 상태" icon={Server}>
        <div className="space-y-3">
          <StatusRow
            label="백엔드 API"
            value={health?.status === "ok" ? "연결됨" : "연결 끊김"}
            status={health?.status === "ok" ? "ok" : "error"}
          />
          <StatusRow label="데이터베이스" value="SQLite (WAL mode)" status="ok" />
          <StatusRow
            label="WebSocket"
            value="ws://localhost:48293/ws"
            status="ok"
          />
        </div>
      </SettingsSection>

      {/* Database Info */}
      <SettingsSection title="데이터베이스" icon={Database}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">전체 프로젝트</span>
            <span>{overview?.total_projects ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">활성 작업</span>
            <span>{overview?.active_tasks ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">오늘 세션</span>
            <span>{overview?.today_sessions ?? 0}</span>
          </div>
        </div>
      </SettingsSection>

      {/* Data Retention */}
      <SettingsSection title="데이터 보존" icon={Trash2}>
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <p>이벤트: 90일</p>
          <p>도구 호출: 60일</p>
          <p>오류: 180일</p>
          <p>세션: 365일</p>
        </div>
        {cleanupResult && (
          <div className="p-3 rounded-md bg-muted text-sm mb-3">
            <p>정리 완료:</p>
            <pre className="text-xs mt-1">
              {JSON.stringify(cleanupResult, null, 2)}
            </pre>
          </div>
        )}
      </SettingsSection>

      {/* About */}
      <SettingsSection title="정보" icon={RefreshCw}>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>MCP Project Manager v1.0.0</p>
          <p>Claude Code 워크플로우를 위한 프로젝트 관리 시스템</p>
          <p className="text-xs mt-4">
            Built with FastAPI + Next.js + MCP SDK
          </p>
        </div>
      </SettingsSection>
    </div>
  );
}

function SettingsSection({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 mb-4">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h2 className="font-medium">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function StatusRow({
  label,
  value,
  status,
}: {
  label: string;
  value: string;
  status: "ok" | "error" | "warning";
}) {
  const colors = {
    ok: "bg-green-500",
    error: "bg-red-500",
    warning: "bg-yellow-500",
  };
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
        <span>{label}</span>
      </div>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}
