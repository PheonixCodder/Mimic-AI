import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DashboardSidebar } from "@/features/dashboard/components/dashboard-sidebar";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const insforge = await createInsForgeServerClient();
  const { data } = await insforge.auth.getCurrentUser();

  if (!data?.user) {
    redirect("/login");
  }

  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(trpc.profile.getMe.queryOptions()),
    queryClient.prefetchQuery(trpc.workspaces.getCurrent.queryOptions()),
    queryClient.prefetchQuery(trpc.workspaces.list.queryOptions()),
  ]);

  const cookieStore = await cookies();
  const sidebarState = cookieStore.get("sidebar_state")?.value;
  const defaultOpen = sidebarState === undefined ? true : sidebarState === "true";

  return (
    <HydrateClient>
      <TooltipProvider>
        <SidebarProvider defaultOpen={defaultOpen} className="h-svh">
          <DashboardSidebar />
          <SidebarInset className="min-h-0 min-w-0">
            <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </HydrateClient>
  );
}
