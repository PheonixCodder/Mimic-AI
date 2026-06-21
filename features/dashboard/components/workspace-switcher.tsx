"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useTRPC } from "@/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function WorkspaceAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 via-emerald-600 to-green-700 text-xs font-semibold text-white shadow-md shadow-emerald-900/10 border border-emerald-400/20 tracking-wider">
      {initials}
    </div>
  );
}

export function WorkspaceSwitcher() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  const { data: currentData, isLoading } = useQuery(trpc.workspaces.getCurrent.queryOptions());
  const { data: workspaceList } = useQuery(trpc.workspaces.list.queryOptions());

  const setActive = useMutation(
    trpc.workspaces.setActive.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.workspaces.getCurrent.queryKey(),
        });
      },
    }),
  );

  const createWorkspaceMutation = useMutation(
    trpc.workspaces.create.mutationOptions({
      onSuccess: async () => {
        toast.success("Workspace created");
        setShowAddDialog(false);
        setNewWorkspaceName("");
        await queryClient.invalidateQueries({
          queryKey: trpc.workspaces.getCurrent.queryKey(),
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.workspaces.list.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to create workspace");
      },
    }),
  );

  const handleCreateWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    createWorkspaceMutation.mutate({ name: newWorkspaceName.trim() });
  };

  if (isLoading) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Skeleton className="h-10 w-full rounded-md" />
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  const currentWorkspace = currentData?.workspace;
  const workspaces = workspaceList ?? [];

  if (!currentWorkspace) {
    return null;
  }

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuButton size="lg" className="w-full hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-all border border-zinc-200/50 dark:border-zinc-800 shadow-2xs rounded-xl p-2" />
              }
            >
              <WorkspaceAvatar name={currentWorkspace.name} />
              <div className="flex flex-1 flex-col items-start text-left text-sm leading-tight min-w-0">
                <span className="truncate font-semibold text-foreground tracking-tight">
                  {currentWorkspace.name}
                </span>
                <span className="truncate text-[10px] text-muted-foreground font-medium capitalize">
                  {currentData?.role}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground/75" />
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-64 p-1.5 shadow-xl border border-zinc-200/80 dark:border-zinc-800 bg-popover rounded-xl" align="start" side="bottom">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                  Workspaces
                </DropdownMenuLabel>

                {workspaces.map(({ workspace, role }: any) => {
                  const isActive = workspace.id === currentWorkspace.id;

                  return (
                    <DropdownMenuItem
                      key={workspace.id}
                      disabled={setActive.isPending}
                      className={`gap-2.5 p-2 rounded-lg cursor-pointer transition-all duration-150 ${
                        isActive
                          ? "bg-accent/60 text-accent-foreground font-medium"
                          : "hover:bg-accent/40 text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => {
                        if (!isActive) {
                          setActive.mutate({ workspaceId: workspace.id });
                        }
                      }}
                    >
                      <WorkspaceAvatar name={workspace.name} />
                      <div className="flex flex-1 flex-col text-left text-sm leading-tight min-w-0">
                        <div className="truncate font-semibold text-foreground">{workspace.name}</div>
                        <div className="truncate text-[10px] capitalize text-muted-foreground/90 font-medium">
                          {role}
                        </div>
                      </div>
                      {isActive && (
                        <div className="flex size-5 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 shadow-sm border border-emerald-500/20">
                          <Check className="size-3.5 stroke-[2.5]" />
                        </div>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuGroup>

              <DropdownMenuSeparator className="my-1.5" />

              <DropdownMenuItem
                className="gap-2.5 p-2 rounded-lg cursor-pointer text-foreground hover:bg-accent/40"
                onClick={() => setShowAddDialog(true)}
              >
                <div className="flex size-7 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-background text-muted-foreground shadow-sm">
                  <Plus className="size-4" />
                </div>
                <div className="text-sm font-medium text-foreground">Add workspace</div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md rounded-2xl p-6 font-sans">
          <DialogHeader>
            <DialogTitle>Create Workspace</DialogTitle>
            <DialogDescription>
              Create a new workspace to collaborate with your team or organize your projects.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateWorkspace} className="space-y-5 pt-3">
            <div className="space-y-2">
              <Label htmlFor="workspace-name" className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Workspace Name
              </Label>
              <Input
                id="workspace-name"
                required
                placeholder="e.g. Acme Corporation"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                disabled={createWorkspaceMutation.isPending}
                className="h-10 rounded-xl"
              />
            </div>

            <DialogFooter className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="outline"
                type="button"
                onClick={() => setShowAddDialog(false)}
                disabled={createWorkspaceMutation.isPending}
                className="rounded-xl h-10 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createWorkspaceMutation.isPending}
                className="rounded-xl h-10 cursor-pointer"
              >
                {createWorkspaceMutation.isPending ? "Creating..." : "Create Workspace"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}