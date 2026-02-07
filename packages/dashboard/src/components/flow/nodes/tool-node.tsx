import { Handle, Position, type NodeProps } from "@xyflow/react";

export function ToolNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border-2 border-orange-500/50 bg-orange-500/10 px-4 py-3 min-w-[120px]">
      <Handle type="target" position={Position.Top} className="!bg-orange-500" />
      <div className="text-xs text-orange-400 font-medium mb-1">Tool</div>
      <div className="text-sm font-semibold text-foreground">{data.label as string}</div>
      <div className="text-xs text-muted-foreground mt-1">{data.calls as number} calls</div>
      <Handle type="source" position={Position.Bottom} className="!bg-orange-500" />
    </div>
  );
}
