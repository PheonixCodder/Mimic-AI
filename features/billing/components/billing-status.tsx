"use client";

import { useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CreditCard,
  Zap,
  ArrowUpRight,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCheckout } from "@/features/billing/hooks/use-checkout";
import { useTRPC } from "@/trpc/client";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

function UpgradeCard() {
  const { checkout, isPending } = useCheckout();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background">
          <Zap className="h-3.5 w-3.5 text-emerald-500" />
        </div>
        <div className="min-w-0">
          <p className="text-[13px] font-semibold tracking-tight text-foreground">
            Upgrade to Pro
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
            Unlock voice clones, avatars &amp; video generation.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs gap-1.5 border-emerald-600/30 hover:border-emerald-600/60 hover:bg-emerald-50/30"
        disabled={isPending}
        onClick={checkout}
        id="billing-upgrade-btn"
      >
        {isPending ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Redirecting…
          </>
        ) : (
          <>
            <ArrowUpRight className="h-3 w-3" />
            Get Started
          </>
        )}
      </Button>
    </div>
  );
}

function UsageCard({ estimatedCostCents }: { estimatedCostCents: number }) {
  const trpc = useTRPC();
  const portalMutation = useMutation(
    trpc.billing.createPortalSession.mutationOptions({}),
  );

  const openPortal = useCallback(() => {
    portalMutation.mutate(undefined, {
      onSuccess: (data) => {
        window.open(data.portalUrl, "_blank");
      },
    });
  }, [portalMutation]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-background">
          <CreditCard className="h-3.5 w-3.5 text-emerald-500" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-[13px] font-semibold tracking-tight text-foreground">
              Pro Plan
            </p>
            <Badge
              variant="outline"
              className="h-4 px-1.5 text-[10px] border-emerald-600/40 text-emerald-600"
            >
              Active
            </Badge>
          </div>
          <p className="text-[18px] font-bold tracking-tight text-foreground mt-0.5">
            {formatCurrency(estimatedCostCents)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Estimated this billing period
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="w-full h-8 text-xs gap-1.5"
        disabled={portalMutation.isPending}
        onClick={openPortal}
        id="billing-portal-btn"
      >
        {portalMutation.isPending ? (
          <>
            <Loader2 className="h-3 w-3 animate-spin" />
            Opening…
          </>
        ) : (
          <>
            <ExternalLink className="h-3 w-3" />
            Manage Billing
          </>
        )}
      </Button>
    </div>
  );
}

/**
 * Sidebar billing widget — shows "Upgrade" when unsubscribed, or
 * the current estimated usage cost with a billing portal link.
 * Collapses gracefully when the sidebar is in icon mode.
 */
export function BillingStatus() {
  const trpc = useTRPC();
  const { data, isLoading } = useQuery({
    ...trpc.billing.getStatus.queryOptions(),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="group-data-[collapsible=icon]:hidden rounded-lg border border-border bg-background p-3">
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="group-data-[collapsible=icon]:hidden rounded-lg border border-border bg-background p-3">
      {data?.hasActiveSubscription ? (
        <UsageCard estimatedCostCents={data.estimatedCostCents} />
      ) : (
        <UpgradeCard />
      )}
    </div>
  );
}
