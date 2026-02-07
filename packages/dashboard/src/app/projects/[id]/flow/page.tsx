import { FlowGraphView } from "@/components/flow/flow-graph-view";

export default function FlowPage({ params }: { params: Promise<{ id: string }> }) {
  return <FlowGraphView paramsPromise={params} />;
}
