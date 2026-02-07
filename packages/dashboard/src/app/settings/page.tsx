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
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      {/* Service Status */}
      <SettingsSection title="Service Status" icon={Server}>
        <div className="space-y-3">
          <StatusRow
            label="Backend API"
            value={health?.status === "ok" ? "Connected" : "Disconnected"}
            status={health?.status === "ok" ? "ok" : "error"}
          />
          <StatusRow label="Database" value="SQLite (WAL mode)" status="ok" />
          <StatusRow
            label="WebSocket"
            value="ws://localhost:48293/ws"
            status="ok"
          />
        </div>
      </SettingsSection>

      {/* Database Info */}
      <SettingsSection title="Database" icon={Database}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Projects</span>
            <span>{overview?.total_projects ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Active Tasks</span>
            <span>{overview?.active_tasks ?? 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Today Sessions</span>
            <span>{overview?.today_sessions ?? 0}</span>
          </div>
        </div>
      </SettingsSection>

      {/* Data Retention */}
      <SettingsSection title="Data Retention" icon={Trash2}>
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <p>Events: 90 days</p>
          <p>Tool calls: 60 days</p>
          <p>Errors: 180 days</p>
          <p>Sessions: 365 days</p>
        </div>
        {cleanupResult && (
          <div className="p-3 rounded-md bg-muted text-sm mb-3">
            <p>Cleanup complete:</p>
            <pre className="text-xs mt-1">
              {JSON.stringify(cleanupResult, null, 2)}
            </pre>
          </div>
        )}
      </SettingsSection>

      {/* About */}
      <SettingsSection title="About" icon={RefreshCw}>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>MCP Project Manager v1.0.0</p>
          <p>A full project management system for Claude Code workflows.</p>
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
