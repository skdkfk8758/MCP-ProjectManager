"use client";

import { use, useState, useCallback, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch, type AgentStat, type DashboardOverview } from "@/lib/api";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AgentNode } from "./nodes/agent-node";
import { SkillNode } from "./nodes/skill-node";
import { ToolNode } from "./nodes/tool-node";
import { SessionNode } from "./nodes/session-node";
import { NodeDetailPanel } from "./node-detail-panel";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const nodeTypes = {
  agent: AgentNode,
  skill: SkillNode,
  tool: ToolNode,
  session: SessionNode,
};

interface FlowGraphViewProps {
  paramsPromise: Promise<{ id: string }>;
}

export function FlowGraphView({ paramsPromise }: FlowGraphViewProps) {
  const params = use(paramsPromise);
  const projectId = params.id;
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const { data: agentStats } = useQuery<AgentStat[]>({
    queryKey: ["analytics", "agent-stats"],
    queryFn: () => apiFetch<AgentStat[]>("/api/dashboard/agent-stats?days=30"),
  });

  const { data: overview } = useQuery<DashboardOverview>({
    queryKey: ["dashboard", "overview"],
    queryFn: () => apiFetch<DashboardOverview>("/api/dashboard/overview"),
  });

  const { nodes: layoutNodes, edges: layoutEdges } = useMemo(() => {
    if (!agentStats && !overview) return { nodes: [], edges: [] };

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Session root node
    nodes.push({
      id: "session-root",
      type: "session",
      position: { x: 400, y: 0 },
      data: { label: "Session", sessions: overview?.today_sessions ?? 0 },
    });

    // Agent nodes from stats
    const agents = agentStats || [];
    agents.forEach((agent, i) => {
      const nodeId = `agent-${agent.agent_type}-${agent.model}`;
      nodes.push({
        id: nodeId,
        type: "agent",
        position: { x: 150 + (i % 4) * 200, y: 150 },
        data: {
          label: agent.agent_type,
          model: agent.model,
          calls: agent.total_calls,
          avgDuration: Math.round(agent.avg_duration_ms),
          successRate: Math.round(agent.success_rate),
        },
      });
      edges.push({
        id: `e-session-${nodeId}`,
        source: "session-root",
        target: nodeId,
        animated: true,
        style: { stroke: "#6366f1" },
        label: `${agent.total_calls} calls`,
      });
    });

    // Tool nodes from recent activity
    const toolCounts: Record<string, number> = {};
    const events = overview?.recent_activity || [];
    events.forEach((e) => {
      if (e.type === "tool_call" && e.payload?.tool_name) {
        const name = String(e.payload.tool_name);
        toolCounts[name] = (toolCounts[name] || 0) + 1;
      }
    });

    Object.entries(toolCounts).forEach(([name, count], i) => {
      const nodeId = `tool-${name}`;
      nodes.push({
        id: nodeId,
        type: "tool",
        position: { x: 100 + (i % 5) * 180, y: 350 },
        data: { label: name, calls: count },
      });
      // Connect tools to first agent or session
      const sourceId = agents.length > 0 ? `agent-${agents[0].agent_type}-${agents[0].model}` : "session-root";
      edges.push({
        id: `e-${sourceId}-${nodeId}`,
        source: sourceId,
        target: nodeId,
        style: { stroke: "#f97316" },
      });
    });

    return { nodes, edges };
  }, [agentStats, overview]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes);
  const [edgesState, setEdges, onEdgesChange] = useEdgesState(layoutEdges);

  // Update nodes when data changes
  useEffect(() => {
    if (layoutNodes.length > 0) {
      setNodes(layoutNodes);
      setEdges(layoutEdges);
    }
  }, [layoutNodes, layoutEdges, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  const filteredNodes = filterType === "all"
    ? nodes
    : nodes.filter(n => n.type === filterType || n.id === "session-root");

  const filteredEdges = edgesState.filter(e =>
    filteredNodes.some(n => n.id === e.source) && filteredNodes.some(n => n.id === e.target)
  );

  return (
    <div className="h-[calc(100vh-3rem)]">
      <div className="flex items-center gap-4 mb-4">
        <Link href={`/projects/${projectId}`} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold">Flow Graph</h1>
      </div>

      <div className="h-[calc(100vh-7rem)] rounded-lg border border-border bg-card overflow-hidden relative">
        <ReactFlow
          nodes={filteredNodes}
          edges={filteredEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="bg-card"
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#27272a" />
          <Controls className="!bg-card !border-border [&>button]:!bg-card [&>button]:!border-border [&>button]:!text-foreground" />
          <MiniMap
            nodeColor={(n) => {
              switch (n.type) {
                case "agent": return "#6366f1";
                case "skill": return "#22c55e";
                case "tool": return "#f97316";
                default: return "#06b6d4";
              }
            }}
            className="!bg-muted !border-border"
          />
          <Panel position="top-right" className="flex gap-2">
            <FilterButton active={filterType === "all"} onClick={() => setFilterType("all")}>All</FilterButton>
            <FilterButton active={filterType === "agent"} onClick={() => setFilterType("agent")}>Agents</FilterButton>
            <FilterButton active={filterType === "skill"} onClick={() => setFilterType("skill")}>Skills</FilterButton>
            <FilterButton active={filterType === "tool"} onClick={() => setFilterType("tool")}>Tools</FilterButton>
          </Panel>
        </ReactFlow>

        {selectedNode && (
          <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
        )}
      </div>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded-md transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card border border-border text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
