import Link from "next/link";
import { type LucideIcon } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

type DashboardPageShellProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  children?: React.ReactNode;
  className?: string;
};

export function DashboardPageShell({
  title,
  description,
  icon: Icon,
  breadcrumbs,
  children,
  className,
}: DashboardPageShellProps) {
  return (
    <div className={cn("relative flex min-h-full flex-col", className)}>
      <PageHeader title={title} className="lg:hidden" />

      <div className="space-y-6 p-4 lg:p-8">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink render={<Link href="/dashboard" />}>
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.label} className="contents">
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    {crumb.href ? (
                      <BreadcrumbLink render={<Link href={crumb.href} />}>
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </span>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        ) : null}

        <div className="space-y-1">
          <h1 className="hidden text-2xl font-semibold tracking-tight lg:block">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        {children ?? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Icon />
              </EmptyMedia>
              <EmptyTitle>{title} coming soon</EmptyTitle>
              <EmptyDescription>
                This section is part of the Phase 1 skeleton. UI and mock data
                will land here next.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </div>
    </div>
  );
}
