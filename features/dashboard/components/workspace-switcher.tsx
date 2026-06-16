"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown, Plus } from "lucide-react";

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
import {
  sidebarControlButtonClassName,
  sidebarControlSkeletonClassName,
  WorkspaceAvatar,
} from "@/features/dashboard/components/sidebar-control-styles";
import { useTRPC } from "@/trpc/client";

export function WorkspaceSwitcher() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const currentQuery = useQuery(trpc.workspaces.getCurrent.queryOptions());
  const listQuery = useQuery(trpc.workspaces.list.queryOptions());

  const setActive = useMutation(
    trpc.workspaces.setActive.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.workspaces.getCurrent.queryKey(),
        });
      },
    }),
  );

  if (currentQuery.isLoading) {
    return <Skeleton className={sidebarControlSkeletonClassName} />;
  }

  const currentWorkspace = currentQuery.data?.workspace;
  const workspaces = listQuery.data ?? [];

  if (!currentWorkspace) {
    return null;
  }

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:items-center">
      <SidebarMenuItem className="w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                tooltip={currentWorkspace.name}
                className={sidebarControlButtonClassName}
              />
            }
          >
            <WorkspaceAvatar name={currentWorkspace.name} />
            <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium tracking-tight group-data-[collapsible=icon]:hidden">
              {currentWorkspace.name}
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side="bottom"
            sideOffset={6}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">
                Workspaces
              </DropdownMenuLabel>
              {workspaces.map(({ workspace, role }) => {
                const isActive = workspace.id === currentWorkspace.id;

                return (
                  <DropdownMenuItem
                    key={workspace.id}
                    disabled={setActive.isPending || isActive}
                    className="gap-2 py-2"
                    onClick={() => {
                      if (isActive) {
                        return;
                      }

                      setActive.mutate({ workspaceId: workspace.id });
                    }}
                  >
                    <WorkspaceAvatar name={workspace.name} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{workspace.name}</p>
                      <p className="truncate text-xs capitalize text-muted-foreground">
                        {role}
                      </p>
                    </div>
                    {isActive ? (
                      <Check className="size-4 shrink-0 text-primary" />
                    ) : null}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem disabled className="gap-2 text-muted-foreground">
                <Plus className="size-4" />
                Create workspace
                <span className="ml-auto text-xs">Soon</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
