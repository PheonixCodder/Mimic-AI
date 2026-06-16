import { logger, task } from "@trigger.dev/sdk/v3";
import { createAdminClient } from "@insforge/sdk";
import crypto from "crypto";

export type SendWebhookPayload = {
  workspaceId?: string;
  endpointId?: string;
  event: string;
  payload: any;
};

type WebhookEndpoint = {
  id: string;
  workspace_id: string;
  url: string;
  secret: string;
  description: string | null;
  active: boolean;
  events: string[];
};

export const sendWebhookTask = task({
  id: "send-webhook",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 2000,
    maxTimeoutInMs: 60000,
  },
  run: async (payload: SendWebhookPayload) => {
    logger.info("Executing webhook delivery task", {
      workspaceId: payload.workspaceId,
      endpointId: payload.endpointId,
      event: payload.event,
    });

    const db = createAdminClient({
      baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
      apiKey: process.env.INSFORGE_API_KEY!,
    });

    let endpoints: WebhookEndpoint[] = [];

    // 1. Fetch matching endpoints
    if (payload.endpointId) {
      // Direct delivery (e.g. test ping)
      const { data, error } = await db.database
        .from("webhook_endpoints")
        .select("*")
        .eq("id", payload.endpointId)
        .single();

      if (error || !data) {
        logger.error("Webhook endpoint not found", { endpointId: payload.endpointId, error });
        throw new Error(`Webhook endpoint ${payload.endpointId} not found`);
      }
      endpoints = [data as WebhookEndpoint];
    } else if (payload.workspaceId) {
      // Workspace broadcast
      const { data, error } = await db.database
        .from("webhook_endpoints")
        .select("*")
        .eq("workspace_id", payload.workspaceId)
        .eq("active", true);

      if (error) {
        logger.error("Failed to fetch workspace webhook endpoints", { workspaceId: payload.workspaceId, error });
        throw error;
      }
      
      const allEndpoints = (data ?? []) as WebhookEndpoint[];
      // Filter endpoints subscribing to this event
      endpoints = allEndpoints.filter((e) => e.events.includes(payload.event));
    }

    if (endpoints.length === 0) {
      logger.info("No matching active webhook endpoints found for event", { event: payload.event });
      return { sent: 0 };
    }

    logger.info(`Found ${endpoints.length} endpoint(s) to deliver to`);

    // 2. Deliver to each endpoint
    for (const endpoint of endpoints) {
      const envelope = {
        id: `evt_${crypto.randomUUID().replace(/-/g, "")}`,
        event: payload.event,
        created_at: new Date().toISOString(),
        data: payload.payload,
      };

      const bodyString = JSON.stringify(envelope);
      const signature = crypto
        .createHmac("sha256", endpoint.secret)
        .update(bodyString)
        .digest("hex");

      const requestHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "Mimic-AI-Webhooks/1.0",
        "X-Mimic-Event": payload.event,
        "X-Mimic-Signature": signature,
      };

      const startTime = Date.now();
      let response: Response | null = null;
      let responseBody: string | null = null;
      let errorMsg: string | null = null;
      let statusCode: number | null = null;
      let responseHeaders: Record<string, string> | null = null;

      try {
        response = await fetch(endpoint.url, {
          method: "POST",
          headers: requestHeaders,
          body: bodyString,
          signal: AbortSignal.timeout(10000), // 10s timeout
        });

        statusCode = response.status;
        responseHeaders = Object.fromEntries(response.headers.entries());
        responseBody = await response.text();
        
        if (responseBody.length > 4000) {
          responseBody = responseBody.slice(0, 4000) + "... (truncated)";
        }
      } catch (err) {
        errorMsg = err instanceof Error ? err.message : String(err);
        logger.warn("Webhook delivery request failed", { url: endpoint.url, error: errorMsg });
      }

      const durationMs = Date.now() - startTime;
      const success = response ? response.ok : false;

      // 3. Log delivery attempt in the database
      const { error: insertError } = await db.database
        .from("webhook_deliveries")
        .insert([
          {
            endpoint_id: endpoint.id,
            event: payload.event,
            payload: envelope,
            request_headers: requestHeaders,
            response_headers: responseHeaders,
            response_body: responseBody || errorMsg || null,
            status_code: statusCode,
            duration_ms: durationMs,
            success,
          },
        ]);

      if (insertError) {
        logger.error("Failed to write webhook delivery log", { endpointId: endpoint.id, error: insertError });
      } else {
        logger.info("Webhook delivery logged successfully", {
          endpointId: endpoint.id,
          success,
          statusCode,
          durationMs,
        });
      }
    }

    return { sent: endpoints.length };
  },
});
