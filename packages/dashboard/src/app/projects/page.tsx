"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";
import { CreateProjectButton } from "@/components/dashboard/create-project-dialog";
import { formatDistanceToNow } from "date-fns";

export default function ProjectsPage() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["projects"],
    queryFn: () => api.projects.list(),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">프로젝트</h1>
        <CreateProjectButton />
      </div>
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {projects?.map((project: any) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <div className="rounded-lg border border-border bg-card p-4 hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{project.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {project.description || "설명 없음"}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted-foreground">
                    <p>{project.task_count} 작업</p>
                    <p>
                      {formatDistanceToNow(new Date(project.updated_at), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
          {(!projects || projects.length === 0) && (
            <div className="text-center py-16 text-muted-foreground">
              <p className="text-lg mb-2">아직 프로젝트가 없습니다</p>
              <p className="text-sm">
                첫 프로젝트를 만들어 시작하세요.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
