import { Handle, Position, type NodeProps } from "@xyflow/react";

export function AgentNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border-2 border-blue-500/50 bg-blue-500/10 px-4 py-3 min-w-[160px]">
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      <div className="text-xs text-blue-400 font-medium mb-1">Agent</div>
      <div className="text-sm font-semibold text-foreground">{data.label as string}</div>
      <div className="text-xs text-muted-foreground mt-1">{data.model as string}</div>
      <div className="flex gap-2 mt-2 text-xs">
        <span className="text-blue-300">{data.calls as number} calls</span>
        <span className="text-green-400">{data.successRate as number}%</span>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
}
