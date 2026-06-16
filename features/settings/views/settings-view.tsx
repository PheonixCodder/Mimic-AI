"use client";

import { Settings } from "lucide-react";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfilePanel } from "@/features/settings/components/profile-panel";
import { WorkspaceSettingsPanel } from "@/features/settings/components/workspace-settings-panel";
import { TeamMembersPanel } from "@/features/settings/components/team-members-panel";
import { NotificationsPanel } from "@/features/settings/components/notifications-panel";
import { BillingSettingsPanel } from "@/features/billing/components/billing-settings-panel";

export function SettingsView() {
  return (
    <DashboardPageShell
      title="Settings"
      description="Workspace preferences, billing, and account settings."
      icon={Settings}
      breadcrumbs={[{ label: "Settings" }]}
    >
      <div className="max-w-2xl">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="w-full justify-start mb-6 h-9 p-1 bg-muted/50 rounded-lg">
            <TabsTrigger value="profile" className="text-xs h-7" id="settings-tab-profile">
              Profile
            </TabsTrigger>
            <TabsTrigger value="workspace" className="text-xs h-7" id="settings-tab-workspace">
              Workspace
            </TabsTrigger>
            <TabsTrigger value="team" className="text-xs h-7" id="settings-tab-team">
              Team
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs h-7" id="settings-tab-notifications">
              Notifications
            </TabsTrigger>
            <TabsTrigger value="billing" className="text-xs h-7" id="settings-tab-billing">
              Billing &amp; Usage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-0">
            <ProfilePanel />
          </TabsContent>

          <TabsContent value="workspace" className="mt-0">
            <WorkspaceSettingsPanel />
          </TabsContent>

          <TabsContent value="team" className="mt-0">
            <TeamMembersPanel />
          </TabsContent>

          <TabsContent value="notifications" className="mt-0">
            <NotificationsPanel />
          </TabsContent>

          <TabsContent value="billing" className="mt-0">
            <BillingSettingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardPageShell>
  );
}
