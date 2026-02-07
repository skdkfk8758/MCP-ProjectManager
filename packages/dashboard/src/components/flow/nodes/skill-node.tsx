import { Handle, Position, type NodeProps } from "@xyflow/react";

export function SkillNode({ data }: NodeProps) {
  return (
    <div className="rounded-lg border-2 border-green-500/50 bg-green-500/10 px-4 py-3 min-w-[140px]">
      <Handle type="target" position={Position.Top} className="!bg-green-500" />
      <div className="text-xs text-green-400 font-medium mb-1">Skill</div>
      <div className="text-sm font-semibold text-foreground">{data.label as string}</div>
      {data.trigger ? (
        <div className="text-xs text-muted-foreground mt-1">{data.trigger as string}</div>
      ) : null}
      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </div>
  );
}
