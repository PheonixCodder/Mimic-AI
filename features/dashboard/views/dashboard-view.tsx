import { PageHeader } from "@/components/page-header";
import { DashboardHeader } from "@/features/dashboard/components/dashboard-header";
import { HeroPattern } from "@/features/dashboard/components/hero-pattern";
import { QuickActionsPanel } from "@/features/dashboard/components/quick-actions-panel";

export function DashboardView() {
  return (
    <div className="relative">
      <PageHeader title="Dashboard" className="lg:hidden" />
      <HeroPattern />
      <div className="relative space-y-8 p-4 lg:p-16">
        <DashboardHeader />
        <QuickActionsPanel />
      </div>
    </div>
  );
}
