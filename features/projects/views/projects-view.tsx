"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { FolderKanban } from "lucide-react";
import { useState } from "react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { DeleteProjectDialog } from "@/features/projects/components/delete-project-dialog";
import { ProjectCard } from "@/features/projects/components/project-card";
import { ProjectFormDialog } from "@/features/projects/components/project-form-dialog";
import { ProjectsToolbar } from "@/features/projects/components/projects-toolbar";
import type { Project } from "@/trpc/routers/projects";
import { useTRPC } from "@/trpc/client";

export function ProjectsView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: projects } = useSuspenseQuery(trpc.projects.list.queryOptions());
  const { data: workspace } = useSuspenseQuery(
    trpc.workspaces.getCurrent.queryOptions(),
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const canWrite = ["owner", "admin", "member"].includes(workspace.role);

  const createMutation = useMutation(
    trpc.projects.create.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.projects.list.queryKey(),
        });
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.projects.update.mutationOptions({
      onSuccess: async (project) => {
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: trpc.projects.list.queryKey(),
          }),
          queryClient.invalidateQueries({
            queryKey: trpc.projects.getById.queryKey({ id: project.id }),
          }),
        ]);
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.projects.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.projects.list.queryKey(),
        });
      },
    }),
  );

  async function handleCreate(values: { name: string; description: string }) {
    await createMutation.mutateAsync(values);
  }

  async function handleUpdate(values: { name: string; description: string }) {
    if (!editingProject) {
      return;
    }

    await updateMutation.mutateAsync({
      id: editingProject.id,
      ...values,
    });
    setEditingProject(null);
  }

  async function handleDelete(projectId: string) {
    await deleteMutation.mutateAsync({ id: projectId });
    setDeletingProject(null);
  }

  return (
    <DashboardPageShell
      title="Projects"
      description="Organize videos, scripts, and assets by project."
      icon={FolderKanban}
      breadcrumbs={[{ label: "Projects" }]}
    >
      <div className="space-y-6">
        <ProjectsToolbar
          canCreate={canWrite}
          onCreate={() => setCreateOpen(true)}
        />

        {projects.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <FolderKanban />
              </EmptyMedia>
              <EmptyTitle>No projects yet</EmptyTitle>
              <EmptyDescription>
                Create your first project to start organizing productions in this
                workspace.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                canEdit={canWrite}
                onEdit={setEditingProject}
                onDelete={setDeletingProject}
              />
            ))}
          </div>
        )}
      </div>

      <ProjectFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      <ProjectFormDialog
        open={Boolean(editingProject)}
        onOpenChange={(open) => {
          if (!open) {
            setEditingProject(null);
          }
        }}
        project={editingProject}
        onSubmit={handleUpdate}
      />

      <DeleteProjectDialog
        project={deletingProject}
        open={Boolean(deletingProject)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingProject(null);
          }
        }}
        onConfirm={handleDelete}
      />
    </DashboardPageShell>
  );
}
