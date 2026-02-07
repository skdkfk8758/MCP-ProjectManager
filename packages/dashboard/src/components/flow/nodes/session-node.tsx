import { Handle, Position, type NodeProps } from "@xyflow/react";

export function SessionNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border-2 border-cyan-500/50 bg-cyan-500/10 px-5 py-3">
      <div className="text-xs text-cyan-400 font-medium mb-1">Session</div>
      <div className="text-sm font-semibold text-foreground">{data.label as string}</div>
      <div className="text-xs text-muted-foreground mt-1">{data.sessions as number} today</div>
      <Handle type="source" position={Position.Bottom} className="!bg-cyan-500" />
    </div>
  );
}
