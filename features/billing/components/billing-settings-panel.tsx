"use client";

import { useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CreditCard,
  Zap,
  ArrowUpRight,
  ExternalLink,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCheckout } from "@/features/billing/hooks/use-checkout";
import { useTRPC } from "@/trpc/client";

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents / 100);
}

const METER_LABELS: Record<string, string> = {
  voice_clone: "Voice Clones",
  avatar_generation: "Avatar Generations",
  script_generation: "Script Characters",
  video_generation: "Video Renders",
};

function PricingRow({
  label,
  description,
  price,
}: {
  label: string;
  description: string;
  price: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <span className="text-sm font-mono font-semibold text-foreground shrink-0 ml-4">
        {price}
      </span>
    </div>
  );
}

function UpgradePanelContent() {
  const { checkout, isPending } = useCheckout();

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-xl border border-emerald-600/20 bg-gradient-to-br from-emerald-50/30 via-background to-background p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-600/30 bg-emerald-50/50">
            <Zap className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground">
              Pay-as-you-go
            </h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Start generating immediately. Only pay for what you use — no monthly
              commitments, no seat fees.
            </p>
          </div>
        </div>
        <Separator className="my-4" />
        <div className="space-y-1 divide-y divide-border">
          <PricingRow
            label="Voice Clones"
            description="Clone a custom voice"
            price="$0.30 / clone"
          />
          <PricingRow
            label="Avatar Generations"
            description="Generate a portrait avatar"
            price="$0.50 / avatar"
          />
          <PricingRow
            label="Script Characters"
            description="AI script generation"
            price="$0.003 / 1k chars"
          />
          <PricingRow
            label="Video Renders"
            description="Full talking avatar video"
            price="Usage-based"
          />
        </div>
        <div className="mt-5">
          <Button
            className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            disabled={isPending}
            onClick={checkout}
            id="billing-settings-upgrade-btn"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Redirecting to checkout…
              </>
            ) : (
              <>
                <ArrowUpRight className="h-4 w-4" />
                Activate Billing
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Trust signals */}
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {[
          "Secure checkout via Polar",
          "Cancel anytime",
          "Sandbox for testing",
        ].map((item) => (
          <div key={item} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <CheckCircle className="h-3 w-3 text-emerald-500" />
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivePanelContent({
  estimatedCostCents,
  activeSubscriptions,
}: {
  estimatedCostCents: number;
  activeSubscriptions: any[];
}) {
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
    <div className="space-y-6">
      {/* Status card */}
      <div className="rounded-xl border border-border bg-background p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background">
              <CreditCard className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-foreground">
                  Pro Plan
                </h3>
                <Badge
                  variant="outline"
                  className="h-5 text-[11px] border-emerald-600/40 text-emerald-600"
                >
                  Active
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {activeSubscriptions.length} active subscription
                {activeSubscriptions.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(estimatedCostCents)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Estimated this period
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Usage meters */}
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Usage Meters
          </p>
          {activeSubscriptions.flatMap((sub: any, subIndex: number) =>
            (sub.meters ?? []).map((meter: any, meterIndex: number) => (
              <div
                key={`${sub.id ?? subIndex}-${meter.meterId ?? meter.id ?? meterIndex}`}
                className="flex items-center justify-between"
              >
                <span className="text-sm text-foreground">
                  {meter.name ?? METER_LABELS[meter.meterId] ?? `Meter ${String(meter.meterId ?? meterIndex).slice(0, 8)}`}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {meter.consumedUnits ?? 0} units
                  </span>
                  <span className="text-sm font-mono text-foreground font-medium">
                    {formatCurrency(meter.amount ?? 0)}
                  </span>
                </div>
              </div>
            )),
          )}
          {activeSubscriptions.every(
            (sub: any) => (sub.meters ?? []).length === 0,
          ) && (
            <p className="text-sm text-muted-foreground">
              No usage recorded yet this period.
            </p>
          )}
        </div>

        <div className="mt-5">
          <Button
            variant="outline"
            className="w-full gap-2"
            disabled={portalMutation.isPending}
            onClick={openPortal}
            id="billing-settings-portal-btn"
          >
            {portalMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Opening portal…
              </>
            ) : (
              <>
                <ExternalLink className="h-4 w-4" />
                Manage Subscription
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Full-page billing settings panel — shown inside /dashboard/settings.
 */
export function BillingSettingsPanel() {
  const trpc = useTRPC();
  const { data, isLoading, isError } = useQuery({
    ...trpc.billing.getStatus.queryOptions(),
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading billing status…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
        <AlertCircle className="h-4 w-4 text-destructive" />
        Could not load billing information. Check your Polar configuration.
      </div>
    );
  }

  return data?.hasActiveSubscription ? (
    <ActivePanelContent
      estimatedCostCents={data.estimatedCostCents}
      activeSubscriptions={data.activeSubscriptions}
    />
  ) : (
    <UpgradePanelContent />
  );
}
