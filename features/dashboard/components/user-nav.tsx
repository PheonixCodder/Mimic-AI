"use client";

import { useQuery } from "@tanstack/react-query";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "@/features/dashboard/components/sidebar-control-styles";
import { getDisplayName, getInitials } from "@/features/dashboard/lib/display-name";
import { useTRPC } from "@/trpc/client";

function UserAvatar({
  displayName,
  email,
  avatarUrl,
  size = "sm",
}: {
  displayName: string;
  email: string;
  avatarUrl: string | null;
  size?: "sm" | "md";
}) {
  const dimension = size === "sm" ? "size-6" : "size-8";

  return (
    <Avatar className={`${dimension} shrink-0 rounded-sm`}>
      {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
      <AvatarFallback className="rounded-sm text-xs font-medium">
        {getInitials(displayName, email)}
      </AvatarFallback>
    </Avatar>
  );
}

export function UserNav() {
  const router = useRouter();
  const trpc = useTRPC();
  const { data, isLoading } = useQuery(trpc.profile.getMe.queryOptions());

  async function handleSignOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  if (isLoading) {
    return <Skeleton className={sidebarControlSkeletonClassName} />;
  }

  const displayName = getDisplayName(data?.profile, data?.user);
  const email = data?.user?.email ?? "";
  const avatarUrl = data?.profile?.avatar_url ?? null;

  return (
    <SidebarMenu className="group-data-[collapsible=icon]:items-center">
      <SidebarMenuItem className="w-full group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                tooltip={displayName}
                className={sidebarControlButtonClassName}
              />
            }
          >
            <UserAvatar
              displayName={displayName}
              email={email}
              avatarUrl={avatarUrl}
            />
            <span className="min-w-0 flex-1 truncate text-left text-[13px] font-medium tracking-tight group-data-[collapsible=icon]:hidden">
              {displayName}
            </span>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side="top"
            align="start"
            sideOffset={8}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-3 px-2 py-2">
                  <UserAvatar
                    displayName={displayName}
                    email={email}
                    avatarUrl={avatarUrl}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{displayName}</p>
                    <p className="truncate text-xs text-muted-foreground">{email}</p>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
                <Settings />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={handleSignOut}>
                <LogOut />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
