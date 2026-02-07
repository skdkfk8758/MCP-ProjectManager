import { TimelineView } from "@/components/timeline/timeline-view";

export default function TimelinePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <TimelineView paramsPromise={params} />;
}
