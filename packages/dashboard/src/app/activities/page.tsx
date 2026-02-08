import { ActivityList } from "@/components/activities/activity-list";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ActivitiesPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/"
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-2xl font-bold">활동 내역</h1>
      </div>
      <ActivityList />
    </div>
  );
}
