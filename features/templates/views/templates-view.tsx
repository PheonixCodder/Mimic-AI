"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { LayoutTemplate, Palette, Plus } from "lucide-react";

import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTRPC } from "@/trpc/client";
import type { Template } from "@/trpc/routers/templates";
import type { BrandKit } from "@/trpc/routers/brand-kits";

import { TemplatesList } from "@/features/templates/components/templates-list";
import { TemplateCreateDialog } from "@/features/templates/components/template-create-dialog";
import { TemplateEditDialog } from "@/features/templates/components/template-edit-dialog";
import { BrandKitsList } from "@/features/templates/components/brand-kits-list";
import { BrandKitCreateDialog } from "@/features/templates/components/brand-kit-create-dialog";
import { BrandKitEditDialog } from "@/features/templates/components/brand-kit-edit-dialog";

type ActiveTab = "templates" | "brandkits";

export function TemplatesView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<ActiveTab>("templates");

  // Templates state
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [deletingTemplate, setDeletingTemplate] = useState<Template | null>(null);
  const [templateDeletePending, setTemplateDeletePending] = useState(false);

  // Brand kit state
  const [editingKit, setEditingKit] = useState<BrandKit | null>(null);
  const [deletingKit, setDeletingKit] = useState<BrandKit | null>(null);
  const [kitDeletePending, setKitDeletePending] = useState(false);

  const { data: workspace } = useSuspenseQuery(trpc.workspaces.getCurrent.queryOptions());
  const { data: templates } = useSuspenseQuery(trpc.templates.list.queryOptions({}));
  const { data: kits } = useSuspenseQuery(trpc.brandKits.list.queryOptions({}));
  const { data: voicesData } = useSuspenseQuery(trpc.voices.getAll.queryOptions({}));
  const { data: avatarsData } = useSuspenseQuery(trpc.avatars.getAll.queryOptions({}));

  const canWrite = ["owner", "admin", "member"].includes(workspace.role);

  const allVoices = [...voicesData.custom, ...voicesData.system];
  const allAvatars = [...avatarsData.custom, ...avatarsData.system];

  // Delete template
  const deleteTemplateMutation = useMutation(
    trpc.templates.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.templates.list.queryKey() });
      },
    }),
  );

  async function handleDeleteTemplate() {
    if (!deletingTemplate) return;
    setTemplateDeletePending(true);
    try {
      await deleteTemplateMutation.mutateAsync({ id: deletingTemplate.id });
      toast.success("Template deleted");
      setDeletingTemplate(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete template");
    } finally {
      setTemplateDeletePending(false);
    }
  }

  // Delete brand kit
  const deleteKitMutation = useMutation(
    trpc.brandKits.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: trpc.brandKits.list.queryKey() });
      },
    }),
  );

  async function handleDeleteKit() {
    if (!deletingKit) return;
    setKitDeletePending(true);
    try {
      await deleteKitMutation.mutateAsync({ id: deletingKit.id });
      toast.success("Brand kit deleted");
      setDeletingKit(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete brand kit");
    } finally {
      setKitDeletePending(false);
    }
  }

  return (
    <DashboardPageShell
      title="Templates"
      description="Brand kits, layouts, and reusable video templates."
      icon={LayoutTemplate}
      breadcrumbs={[{ label: "Templates" }]}
    >
      <div className="space-y-6">
        {/* Tab bar + CTA */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 rounded-lg border p-1">
            <button
              type="button"
              onClick={() => setActiveTab("templates")}
              className={
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                (activeTab === "templates"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              <LayoutTemplate className="size-3.5" />
              Templates
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("brandkits")}
              className={
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
                (activeTab === "brandkits"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              <Palette className="size-3.5" />
              Brand kits
            </button>
          </div>

          {canWrite && activeTab === "templates" ? (
            <TemplateCreateDialog
              brandKits={kits}
              voices={allVoices}
              avatars={allAvatars}
            >
              <Button size="sm">
                <Plus />
                New template
              </Button>
            </TemplateCreateDialog>
          ) : null}

          {canWrite && activeTab === "brandkits" ? (
            <BrandKitCreateDialog>
              <Button size="sm">
                <Plus />
                New brand kit
              </Button>
            </BrandKitCreateDialog>
          ) : null}
        </div>

        {/* Tab content */}
        {activeTab === "templates" ? (
          <TemplatesList
            templates={templates}
            canWrite={canWrite}
            onEdit={setEditingTemplate}
            onDelete={setDeletingTemplate}
          />
        ) : (
          <BrandKitsList
            kits={kits}
            canWrite={canWrite}
            onEdit={setEditingKit}
            onDelete={setDeletingKit}
          />
        )}
      </div>

      {/* Template edit dialog */}
      <TemplateEditDialog
        template={editingTemplate}
        open={Boolean(editingTemplate)}
        onOpenChange={(open) => { if (!open) setEditingTemplate(null); }}
        brandKits={kits}
        voices={allVoices}
        avatars={allAvatars}
      />

      {/* Template delete confirm */}
      <AlertDialog
        open={Boolean(deletingTemplate)}
        onOpenChange={(open) => { if (!open) setDeletingTemplate(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">{deletingTemplate?.name}</span>.
              Videos already created from this template are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={templateDeletePending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteTemplate}
              disabled={templateDeletePending}
            >
              {templateDeletePending ? "Deleting..." : "Delete template"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Brand kit edit dialog */}
      <BrandKitEditDialog
        kit={editingKit}
        open={Boolean(editingKit)}
        onOpenChange={(open) => { if (!open) setEditingKit(null); }}
      />

      {/* Brand kit delete confirm */}
      <AlertDialog
        open={Boolean(deletingKit)}
        onOpenChange={(open) => { if (!open) setDeletingKit(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete brand kit?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-medium text-foreground">{deletingKit?.name}</span>.
              Templates linked to this brand kit will lose their brand association.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={kitDeletePending}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteKit}
              disabled={kitDeletePending}
            >
              {kitDeletePending ? "Deleting..." : "Delete brand kit"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardPageShell>
  );
}
