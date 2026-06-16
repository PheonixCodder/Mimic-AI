"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Logo } from "@/components/logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { UserNav } from "@/features/dashboard/components/user-nav";
import { WorkspaceSwitcher } from "@/features/dashboard/components/workspace-switcher";
import { BillingStatus } from "@/features/billing/components/billing-status";
import {
  dashboardNavSections,
  isNavItemActive,
  type NavItem,
} from "@/features/dashboard/data/nav-items";
import { cn } from "@/lib/utils";

const sidebarMenuButtonClassName =
  "h-9 border border-transparent px-3 py-2 text-[13px] font-medium tracking-tight data-[active=true]:border-border data-[active=true]:shadow-[0px_1px_1px_0px_rgba(44,54,53,0.03),inset_0px_0px_0px_2px_white]";

function NavSection({
  label,
  items,
  pathname,
}: {
  label?: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <SidebarGroup>
      {label ? (
        <SidebarGroupLabel className="text-[13px] uppercase text-muted-foreground">
          {label}
        </SidebarGroupLabel>
      ) : null}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                render={<Link href={item.url} />}
                isActive={isNavItemActive(pathname, item.url)}
                tooltip={item.title}
                className={sidebarMenuButtonClassName}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const sidebar = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-col gap-4 pt-4">
        <div className="flex items-center gap-2 pl-1 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:pl-0">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center overflow-hidden transition-all duration-300 ease-in-out",
              sidebar.state === "collapsed" &&
                "group hover:rounded-md hover:bg-sidebar-accent",
            )}
          >
            {sidebar.state === "collapsed" ? (
              <>
                <SidebarTrigger
                  className={cn(
                    "flex h-full w-0 scale-90 items-center justify-center p-0 opacity-0 transition-all duration-300 ease-in-out group-hover:w-full group-hover:scale-100 group-hover:opacity-100",
                  )}
                />
                <Logo
                  width={24}
                  height={21}
                  href={null}
                  className={cn(
                    "shrink-0 transition-all duration-300 ease-in-out group-hover:w-0 group-hover:scale-75 group-hover:opacity-0",
                  )}
                />
              </>
            ) : (
              <Logo href="/dashboard" width={24} height={21} />
            )}
          </div>

          <span className="font-semibold text-lg tracking-tighter text-foreground group-data-[collapsible=icon]:hidden">
            Mimic AI
          </span>

          {sidebar.state === "expanded" ? (
            <SidebarTrigger className="ml-auto hidden md:inline-flex" />
          ) : null}
          <SidebarTrigger className="ml-auto md:hidden" />
        </div>

        <WorkspaceSwitcher />
      </SidebarHeader>

      <div className="border-b border-dashed border-border" />

      <SidebarContent>
        {dashboardNavSections.map((section) => (
          <NavSection
            key={section.label ?? "main"}
            label={section.label}
            items={section.items}
            pathname={pathname}
          />
        ))}
      </SidebarContent>

      <div className="border-b border-dashed border-border" />

      <SidebarFooter className="gap-2 py-3">
        <BillingStatus />
        <UserNav />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
