"use client";

import Link from "next/link";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, FolderKanban } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { useTRPC } from "@/trpc/client";

type ProjectDetailViewProps = {
  projectId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ProjectDetailView({ projectId }: ProjectDetailViewProps) {
  const trpc = useTRPC();
  const { data: project } = useSuspenseQuery(
    trpc.projects.getById.queryOptions({ id: projectId }),
  );

  return (
    <DashboardPageShell
      title={project.name}
      description="Project overview and linked productions."
      icon={FolderKanban}
      breadcrumbs={[
        { label: "Projects", href: "/dashboard/projects" },
        { label: project.name },
      ]}
    >
      <div className="space-y-6">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="/dashboard/projects" />}
        >
          <ArrowLeft />
          Back to projects
        </Button>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>{project.name}</CardTitle>
            <CardDescription>
              Created {formatDate(project.createdAt)} · Updated{" "}
              {formatDate(project.updatedAt)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {project.description || "No description provided."}
            </p>
            <p className="text-sm text-muted-foreground">
              Videos, scripts, and assets for this project will appear here in
              upcoming phases.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardPageShell>
  );
}
