"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Building2, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";

export function WorkspaceSettingsPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(trpc.workspaces.getCurrent.queryOptions());

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [initialized, setInitialized] = useState(false);

  if (data && !initialized) {
    setName(data.workspace.name);
    setSlug(data.workspace.slug);
    setInitialized(true);
  }

  const canEdit = ["owner", "admin"].includes(data?.role ?? "");

  const updateMutation = useMutation(
    trpc.workspaces.update.mutationOptions({
      onSuccess: () => {
        toast.success("Workspace updated");
        queryClient.invalidateQueries(trpc.workspaces.getCurrent.queryFilter());
      },
      onError: (err: { message?: string }) => {
        toast.error(err.message ?? "Failed to update workspace");
      },
    })
  );

  const handleSave = () => {
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim().toLowerCase();
    if (!trimmedName || !trimmedSlug) return;

    const updates: { name?: string; slug?: string } = {};
    if (trimmedName !== data?.workspace.name) updates.name = trimmedName;
    if (trimmedSlug !== data?.workspace.slug) updates.slug = trimmedSlug;
    if (Object.keys(updates).length === 0) return;

    updateMutation.mutate(updates);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground tracking-tight">Workspace Settings</h2>
        <Badge variant="outline" className="h-5 text-[11px] ml-1">
          {data?.role ?? "member"}
        </Badge>
      </div>
      <Separator />

      <div className="space-y-4 max-w-sm">
        <div className="space-y-1.5">
          <Label htmlFor="workspace-name" className="text-xs font-medium">
            Workspace name
          </Label>
          <Input
            id="workspace-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Workspace"
            disabled={isLoading || !canEdit || updateMutation.isPending}
            className="text-sm"
            maxLength={80}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="workspace-slug" className="text-xs font-medium">
            Slug
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">workspace/</span>
            <Input
              id="workspace-slug"
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
              }
              placeholder="my-workspace"
              disabled={isLoading || !canEdit || updateMutation.isPending}
              className="text-sm"
              maxLength={48}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Lowercase letters, numbers, and hyphens only.
          </p>
        </div>

        {!canEdit && (
          <p className="text-[11px] text-muted-foreground">
            Only workspace owners and admins can update settings.
          </p>
        )}

        {canEdit && (
          <Button
            size="sm"
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleSave}
            disabled={isLoading || updateMutation.isPending}
            id="workspace-save-btn"
          >
            {updateMutation.isPending ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
            ) : (
              <><Save className="h-3.5 w-3.5" /> Save changes</>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
