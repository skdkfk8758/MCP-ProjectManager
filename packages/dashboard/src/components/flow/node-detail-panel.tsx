"use client";

import { X } from "lucide-react";
import type { Node } from "@xyflow/react";

interface NodeDetailPanelProps {
  node: Node;
  onClose: () => void;
}

export function NodeDetailPanel({ node, onClose }: NodeDetailPanelProps) {
  const typeColors: Record<string, string> = {
    agent: "text-blue-400",
    skill: "text-green-400",
    tool: "text-orange-400",
    session: "text-cyan-400",
  };

  return (
    <div className="absolute right-0 top-0 h-full w-72 bg-card border-l border-border p-4 overflow-auto">
      <div className="flex items-center justify-between mb-4">
        <span className={`text-xs font-medium uppercase ${typeColors[node.type || ""] || "text-gray-400"}`}>
          {node.type}
        </span>
        <button aria-label="Close detail panel" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <h3 className="text-lg font-semibold mb-4">{node.data.label as string}</h3>
      <div className="space-y-3">
        {Object.entries(node.data)
          .filter(([key]) => key !== "label")
          .map(([key, value]) => (
            <div key={key}>
              <dt className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1")}</dt>
              <dd className="text-sm font-medium mt-0.5">{String(value)}</dd>
            </div>
          ))}
      </div>
    </div>
  );
}
