import { CheckCircle2, XCircle, Clock, Globe } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type WebhookDelivery = {
  id: string;
  endpointId: string;
  event: string;
  payload: any;
  requestHeaders: Record<string, string> | null;
  responseHeaders: Record<string, string> | null;
  responseBody: string | null;
  statusCode: number | null;
  durationMs: number | null;
  success: boolean;
  createdAt: string;
};

type DeliveryDetailsProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  delivery: WebhookDelivery | null;
};

export function DeliveryDetails({
  open,
  onOpenChange,
  delivery,
}: DeliveryDetailsProps) {
  if (!delivery) return null;

  const formattedDate = new Date(delivery.createdAt).toLocaleString();
  
  // Format request/response headers
  const reqHeaders = delivery.requestHeaders ?? {};
  const resHeaders = delivery.responseHeaders ?? {};

  // Check if response body is JSON and pretty-print it
  let formattedResponseBody = delivery.responseBody;
  if (delivery.responseBody) {
    try {
      const parsed = JSON.parse(delivery.responseBody);
      formattedResponseBody = JSON.stringify(parsed, null, 2);
    } catch {
      // Keep as raw text
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-center gap-2">
            <DialogTitle>Delivery Attempt</DialogTitle>
            <Badge
              variant={delivery.success ? "outline" : "destructive"}
              className={delivery.success ? "gap-1 rounded-full px-2 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30" : "gap-1 rounded-full px-2"}
            >
              {delivery.success ? (
                <CheckCircle2 className="size-3" />
              ) : (
                <XCircle className="size-3" />
              )}
              {delivery.statusCode
                ? `HTTP ${delivery.statusCode}`
                : "Connection Error"}
            </Badge>
          </div>
          <DialogDescription className="font-mono text-xs">
            ID: {delivery.id}
          </DialogDescription>
        </DialogHeader>

        {/* Metadata info */}
        <div className="grid grid-cols-2 gap-3 border border-border rounded-lg p-3 bg-muted/30 text-xs shrink-0 mt-2">
          <div className="space-y-1">
            <span className="text-muted-foreground block font-medium">Event Triggered</span>
            <span className="font-mono text-foreground font-semibold">{delivery.event}</span>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground block font-medium">Delivered At</span>
            <span className="text-foreground font-semibold">{formattedDate}</span>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground block font-medium">Response Time</span>
            <span className="text-foreground font-semibold flex items-center gap-1 font-mono">
              <Clock className="size-3 text-muted-foreground" />
              {delivery.durationMs ? `${delivery.durationMs}ms` : "N/A"}
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground block font-medium">Status</span>
            <span className="text-foreground font-semibold">
              {delivery.success ? "Success" : "Failed / Timeout"}
            </span>
          </div>
        </div>

        {/* Tabs for Request / Response */}
        <Tabs defaultValue="request" className="flex-1 overflow-hidden flex flex-col mt-4">
          <TabsList variant="line" className="shrink-0 border-b border-border w-full justify-start rounded-none">
            <TabsTrigger value="request" className="flex-none">Request</TabsTrigger>
            <TabsTrigger value="response" className="flex-none">Response</TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-foreground">Headers</span>
              <div className="rounded-md border border-border bg-muted/20 p-3 font-mono text-xs max-h-40 overflow-y-auto space-y-1 select-text">
                {Object.keys(reqHeaders).length === 0 ? (
                  <span className="text-muted-foreground italic">No headers present</span>
                ) : (
                  Object.entries(reqHeaders).map(([key, val]) => (
                    <div key={key} className="flex gap-2 break-all">
                      <span className="text-primary font-medium shrink-0">{key}:</span>
                      <span className="text-foreground">{val}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-foreground">Payload (JSON)</span>
              <pre className="rounded-md border border-border bg-muted/50 p-3 font-mono text-xs overflow-x-auto max-h-72 select-text text-foreground">
                {JSON.stringify(delivery.payload, null, 2)}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="response" className="flex-1 overflow-y-auto pt-4 space-y-4 pr-1">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-foreground">Headers</span>
              <div className="rounded-md border border-border bg-muted/20 p-3 font-mono text-xs max-h-40 overflow-y-auto space-y-1 select-text">
                {Object.keys(resHeaders).length === 0 ? (
                  <span className="text-muted-foreground italic">No headers returned</span>
                ) : (
                  Object.entries(resHeaders).map(([key, val]) => (
                    <div key={key} className="flex gap-2 break-all">
                      <span className="text-primary font-medium shrink-0">{key}:</span>
                      <span className="text-foreground">{val}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-semibold text-foreground">Body</span>
              <pre className="rounded-md border border-border bg-muted/50 p-3 font-mono text-xs overflow-auto max-h-72 break-all whitespace-pre-wrap select-text text-foreground">
                {formattedResponseBody ?? (
                  <span className="text-muted-foreground italic">No response body returned</span>
                )}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
