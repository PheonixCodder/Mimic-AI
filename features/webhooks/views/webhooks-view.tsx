"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  Activity,
  AlertCircle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Plus,
  RotateCw,
  Send,
  Trash2,
  Webhook,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { type WebhookEvent } from "@/features/webhooks/lib/schemas";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { WebhookDialog } from "../components/webhook-dialog";
import { DeliveryDetails } from "../components/delivery-details";
import { useTRPC } from "@/trpc/client";

type WebhookEndpoint = {
  id: string;
  url: string;
  secret: string;
  description: string | null;
  active: boolean;
  events: WebhookEvent[];
};

export function WebhooksView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: workspace } = useSuspenseQuery(
    trpc.workspaces.getCurrent.queryOptions(),
  );

  const canAdmin = ["owner", "admin"].includes(workspace.role);

  // States
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);

  // Dialog States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<any | null>(null);

  // Fetch endpoints
  const { data: endpoints, isLoading: isEndpointsLoading } = useQuery({
    ...trpc.webhooks.list.queryOptions(),
    select: (data) => {
      // Auto-select first endpoint if none selected and endpoints exist
      if (data.length > 0 && !selectedEndpointId) {
        setSelectedEndpointId(data[0].id);
      }
      return data;
    },
  });

  const selectedEndpoint = endpoints?.find((e) => e.id === selectedEndpointId);

  // Fetch deliveries for selected endpoint
  const { data: deliveries, isLoading: isDeliveriesLoading, refetch: refetchDeliveries } = useQuery({
    ...trpc.webhooks.listDeliveries.queryOptions(
      { endpointId: selectedEndpointId ?? "" },
    ),
    enabled: Boolean(selectedEndpointId),
  });

  // Mutations
  const createMutation = useMutation(
    trpc.webhooks.create.mutationOptions({
      onSuccess: async (newEndpoint) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.webhooks.list.queryKey(),
        });
        setSelectedEndpointId(newEndpoint.id);
      },
    }),
  );

  const updateMutation = useMutation(
    trpc.webhooks.update.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.webhooks.list.queryKey(),
        });
      },
    }),
  );

  const deleteMutation = useMutation(
    trpc.webhooks.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Webhook endpoint deleted");
        setSelectedEndpointId(null);
        await queryClient.invalidateQueries({
          queryKey: trpc.webhooks.list.queryKey(),
        });
      },
      onError: (e) => toast.error(e.message ?? "Failed to delete endpoint"),
    }),
  );

  const pingMutation = useMutation(
    trpc.webhooks.ping.mutationOptions({
      onSuccess: () => {
        toast.success("Test ping event triggered successfully");
        // Refetch deliveries after a short delay to allow background task processing
        setTimeout(() => {
          refetchDeliveries();
        }, 1500);
      },
      onError: (e) => toast.error(e.message ?? "Failed to trigger test ping"),
    }),
  );

  // Actions
  function handleToggleActive(endpoint: WebhookEndpoint) {
    if (!canAdmin) return;
    updateMutation.mutate({
      id: endpoint.id,
      url: endpoint.url,
      description: endpoint.description ?? "",
      active: !endpoint.active,
      events: endpoint.events,
    });
  }

  function handleCopySecret(secret: string) {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    toast.success("Signing secret copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDelete(id: string) {
    if (confirm("Are you sure you want to delete this webhook endpoint? This action cannot be undone.")) {
      deleteMutation.mutate({ id });
    }
  }

  function handlePing(id: string) {
    pingMutation.mutate({ id });
  }

  // Stats Calculations (Local to selected endpoint deliveries)
  const allDeliveries = deliveries ?? [];
  const totalDeliveriesCount = allDeliveries.length;
  const successDeliveries = allDeliveries.filter((d) => d.success);
  const successRate = totalDeliveriesCount > 0 
    ? Math.round((successDeliveries.length / totalDeliveriesCount) * 100) 
    : 0;
  const avgDuration = totalDeliveriesCount > 0
    ? Math.round(allDeliveries.reduce((sum, d) => sum + (d.durationMs ?? 0), 0) / totalDeliveriesCount)
    : 0;

  return (
    <DashboardPageShell
      title="Webhooks"
      description="Configure outbound webhooks to receive real-time notifications about background jobs."
      icon={Webhook}
      breadcrumbs={[{ label: "Webhooks" }]}
    >
      <div className="space-y-6">
        {/* Header Action Row */}
        <div className="flex items-center justify-end pb-4">
          {canAdmin && (
            <Button size="sm" onClick={() => setIsCreateOpen(true)} className="gap-1.5 font-medium">
              <Plus className="size-4" />
              Add Endpoint
            </Button>
          )}
        </div>

        {isEndpointsLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !endpoints || endpoints.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Webhook />
              </EmptyMedia>
              <EmptyTitle>No webhook endpoints configured</EmptyTitle>
              <EmptyDescription>
                Outbound webhooks notify your external services when background tasks (e.g. video rendering) are queued, started, completed, or failed.
              </EmptyDescription>
              {canAdmin && (
                <Button size="sm" onClick={() => setIsCreateOpen(true)} className="mt-4 gap-1.5">
                  <Plus className="size-4" />
                  Create Webhook Endpoint
                </Button>
              )}
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Sidebar list of endpoints */}
            <div className="space-y-3 lg:col-span-1 border-r border-border/30 pr-0 lg:pr-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Endpoints ({endpoints.length})
              </span>
              <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                {endpoints.map((ep) => {
                  const isSelected = ep.id === selectedEndpointId;
                  return (
                    <button
                      key={ep.id}
                      onClick={() => {
                        setSelectedEndpointId(ep.id);
                        setShowSecret(false);
                      }}
                      className={`w-full text-left rounded-xl p-4 border transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-card hover:border-muted-foreground/30 hover:bg-muted/10"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold truncate text-foreground max-w-[180px]">
                          {ep.url}
                        </span>
                        <Badge
                          variant={ep.active ? "outline" : "secondary"}
                          className={ep.active ? "text-[10px] rounded-full scale-90 origin-right bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30" : "text-[10px] rounded-full scale-90 origin-right"}
                        >
                          {ep.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      {ep.description && (
                        <p className="text-xs text-muted-foreground truncate mt-1">{ep.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        {ep.events.slice(0, 2).map((ev) => (
                          <span
                            key={ev}
                            className="text-[9px] font-mono border border-border px-1 py-0.2 rounded bg-muted/30 text-muted-foreground"
                          >
                            {ev}
                          </span>
                        ))}
                        {ep.events.length > 2 && (
                          <span className="text-[9px] font-mono border border-border px-1 py-0.2 rounded bg-muted/30 text-muted-foreground">
                            +{ep.events.length - 2} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Endpoint Detail & Logs panel */}
            <div className="lg:col-span-2 space-y-6">
              {selectedEndpoint ? (
                <div className="space-y-6">
                  {/* Endpoint Details Card */}
                  <Card className="rounded-xl border shadow-sm">
                    <CardHeader className="p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-2">
                        <div className="space-y-1 max-w-[70%]">
                          <CardTitle className="font-mono text-sm font-bold truncate text-foreground flex items-center gap-1.5">
                            <Globe className="size-4 shrink-0 text-muted-foreground" />
                            {selectedEndpoint.url}
                          </CardTitle>
                          {selectedEndpoint.description && (
                            <CardDescription className="text-xs">{selectedEndpoint.description}</CardDescription>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {canAdmin && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleActive(selectedEndpoint as WebhookEndpoint)}
                                disabled={updateMutation.isPending}
                                className="text-xs font-semibold h-8"
                              >
                                {selectedEndpoint.active ? "Pause" : "Enable"}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsEditOpen(true)}
                                className="text-xs font-semibold h-8"
                              >
                                Edit
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDelete(selectedEndpoint.id)}
                                disabled={deleteMutation.isPending}
                                className="text-xs font-semibold h-8"
                              >
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-5 pt-0 border-t border-border/30 space-y-4 bg-muted/5">
                      {/* Signing Secret */}
                      <div className="pt-4 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-foreground">Signing Secret</span>
                          <p className="text-[11px] text-muted-foreground">Used to verify webhook payloads originate from Mimic AI.</p>
                        </div>
                        <div className="flex items-center gap-1 bg-background border border-border rounded-lg p-1 px-2 font-mono text-xs max-w-sm">
                          <span className="text-foreground truncate select-all">
                            {showSecret ? selectedEndpoint.secret : "••••••••••••••••••••••••••••••••"}
                          </span>
                          <button
                            onClick={() => setShowSecret(!showSecret)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          >
                            {showSecret ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                          </button>
                          <button
                            onClick={() => handleCopySecret(selectedEndpoint.secret)}
                            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors shrink-0"
                          >
                            {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Subscribed Events */}
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between border-t border-border/20 pt-4">
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold text-foreground">Subscribed Events</span>
                          <p className="text-[11px] text-muted-foreground">HTTP events delivered to this endpoint URL.</p>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-w-sm justify-end">
                          {selectedEndpoint.events.map((ev) => (
                            <Badge key={ev} variant="secondary" className="font-mono text-[10px] rounded px-2">
                              {ev}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Trigger Test Webhook */}
                      {canAdmin && (
                        <div className="border-t border-border/20 pt-4 flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-foreground">Test Endpoint</span>
                            <p className="text-[11px] text-muted-foreground">Send a simulated ping event payload to this URL.</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePing(selectedEndpoint.id)}
                            disabled={pingMutation.isPending}
                            className="gap-1.5 text-xs font-semibold h-8"
                          >
                            {pingMutation.isPending ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : (
                              <Send className="size-3.5" />
                            )}
                            Test Endpoint
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Delivery Metrics Overview */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="rounded-xl border p-4 flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-slate-100 dark:bg-muted">
                        <Activity className="size-4.5 text-slate-600 dark:text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xl font-bold font-mono tracking-tight text-foreground">{totalDeliveriesCount}</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Attempts</p>
                      </div>
                    </Card>

                    <Card className="rounded-xl border p-4 flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                        <CheckCircle2 className="size-4.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xl font-bold font-mono tracking-tight text-foreground">{successRate}%</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Success Rate</p>
                      </div>
                    </Card>

                    <Card className="rounded-xl border p-4 flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/20">
                        <Clock className="size-4.5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xl font-bold font-mono tracking-tight text-foreground">{avgDuration}ms</p>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Avg Latency</p>
                      </div>
                    </Card>
                  </div>

                  {/* Deliveries Logs list */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Recent Deliveries (Last 50 attempts)
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => refetchDeliveries()}
                        disabled={isDeliveriesLoading}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                      >
                        <RotateCw className={`size-3 ${isDeliveriesLoading ? "animate-spin" : ""}`} />
                        Refresh
                      </Button>
                    </div>

                    {isDeliveriesLoading ? (
                      <div className="flex h-32 items-center justify-center">
                        <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : allDeliveries.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground bg-muted/5">
                        <AlertCircle className="size-5 mx-auto text-muted-foreground/60 mb-2" />
                        No delivery attempts registered for this endpoint yet. Click &quot;Test Endpoint&quot; above to simulate your first delivery.
                      </div>
                    ) : (
                      <div className="rounded-xl border bg-card overflow-hidden">
                        <div className="divide-y divide-border font-mono text-xs select-none">
                          {allDeliveries.map((delivery: any) => (
                            <div
                              key={delivery.id}
                              onClick={() => setSelectedDelivery(delivery)}
                              className="flex items-center justify-between p-3.5 hover:bg-muted/30 cursor-pointer transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-[60%]">
                                <Badge
                                  variant={delivery.success ? "outline" : "destructive"}
                                  className={delivery.success ? "text-[10px] rounded-full px-2 py-0 h-5 text-center shrink-0 w-16 flex items-center justify-center bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30" : "text-[10px] rounded-full px-2 py-0 h-5 text-center shrink-0 w-16 flex items-center justify-center"}
                                >
                                  {delivery.statusCode ? `HTTP ${delivery.statusCode}` : "ERR"}
                                </Badge>
                                <span className="font-semibold text-foreground truncate">{delivery.event}</span>
                              </div>
                              <div className="flex items-center gap-4 text-muted-foreground text-[11px] shrink-0 font-sans">
                                <span className="font-mono">{delivery.durationMs ? `${delivery.durationMs}ms` : "N/A"}</span>
                                <span>{new Date(delivery.createdAt).toLocaleTimeString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-muted/5 p-6 text-center text-xs text-muted-foreground">
                  Select a webhook endpoint from the sidebar list to inspect configurations and recent delivery logs.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* dialogs */}
      <WebhookDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />

      <WebhookDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        webhook={selectedEndpoint as WebhookEndpoint | null}
        onSubmit={async (values) => {
          if (selectedEndpoint) {
            await updateMutation.mutateAsync({
              id: selectedEndpoint.id,
              ...values,
            });
          }
        }}
      />

      <DeliveryDetails
        open={Boolean(selectedDelivery)}
        onOpenChange={(open) => {
          if (!open) setSelectedDelivery(null);
        }}
        delivery={selectedDelivery}
      />
    </DashboardPageShell>
  );
}
