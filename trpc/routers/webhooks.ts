import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import crypto from "crypto";

import {
  webhookEndpointInputSchema,
  type WebhookEndpointRow,
  type WebhookDeliveryRow,
} from "@/features/webhooks/lib/schemas";
import { createTRPCRouter, workspaceProcedure } from "../init";

const endpointIdSchema = z.object({
  id: z.string().uuid(),
});

function assertCanAdmin(role: string) {
  if (!["owner", "admin"].includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only workspace owners and admins can manage webhook endpoints",
    });
  }
}

function mapWebhookEndpoint(row: WebhookEndpointRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    url: row.url,
    secret: row.secret,
    description: row.description,
    active: row.active,
    events: row.events,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapWebhookDelivery(row: WebhookDeliveryRow) {
  return {
    id: row.id,
    endpointId: row.endpoint_id,
    event: row.event,
    payload: row.payload,
    requestHeaders: row.request_headers,
    responseHeaders: row.response_headers,
    responseBody: row.response_body,
    statusCode: row.status_code,
    durationMs: row.duration_ms,
    success: row.success,
    createdAt: row.created_at,
  };
}

export const webhooksRouter = createTRPCRouter({
  list: workspaceProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.insforge.database
      .from("webhook_endpoints")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message ?? "Failed to list webhook endpoints",
      });
    }

    return ((data ?? []) as WebhookEndpointRow[]).map(mapWebhookEndpoint);
  }),

  getById: workspaceProcedure
    .input(endpointIdSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("webhook_endpoints")
        .select("*")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Webhook endpoint not found",
        });
      }

      return mapWebhookEndpoint(data as WebhookEndpointRow);
    }),

  create: workspaceProcedure
    .input(webhookEndpointInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanAdmin(ctx.role);

      // Generate a whsec_ prefixed signing secret
      const secret = `whsec_${crypto.randomBytes(16).toString("hex")}`;

      const { data, error } = await ctx.insforge.database
        .from("webhook_endpoints")
        .insert({
          workspace_id: ctx.workspace.id,
          url: input.url,
          secret,
          description: input.description,
          active: input.active,
          events: input.events,
        })
        .select()
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to create webhook endpoint",
        });
      }

      return mapWebhookEndpoint(data as WebhookEndpointRow);
    }),

  update: workspaceProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }).merge(webhookEndpointInputSchema),
    )
    .mutation(async ({ ctx, input }) => {
      assertCanAdmin(ctx.role);

      const { data, error } = await ctx.insforge.database
        .from("webhook_endpoints")
        .update({
          url: input.url,
          description: input.description,
          active: input.active,
          events: input.events,
        })
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .select()
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to update webhook endpoint",
        });
      }

      return mapWebhookEndpoint(data as WebhookEndpointRow);
    }),

  delete: workspaceProcedure
    .input(endpointIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanAdmin(ctx.role);

      const { error } = await ctx.insforge.database
        .from("webhook_endpoints")
        .delete()
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message ?? "Failed to delete webhook endpoint",
        });
      }

      return { success: true };
    }),

  listDeliveries: workspaceProcedure
    .input(
      z.object({
        endpointId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // First verify the endpoint belongs to the workspace
      const { data: endpoint, error: endpointError } = await ctx.insforge.database
        .from("webhook_endpoints")
        .select("id")
        .eq("id", input.endpointId)
        .eq("workspace_id", ctx.workspace.id)
        .single();

      if (endpointError || !endpoint) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Webhook endpoint not found in this workspace",
        });
      }

      const { data, error } = await ctx.insforge.database
        .from("webhook_deliveries")
        .select("*")
        .eq("endpoint_id", input.endpointId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message ?? "Failed to retrieve webhook deliveries",
        });
      }

      return ((data ?? []) as WebhookDeliveryRow[]).map(mapWebhookDelivery);
    }),

  ping: workspaceProcedure
    .input(endpointIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanAdmin(ctx.role);

      const { data: endpoint, error: endpointError } = await ctx.insforge.database
        .from("webhook_endpoints")
        .select("id")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .single();

      if (endpointError || !endpoint) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Webhook endpoint not found in this workspace",
        });
      }

      await tasks.trigger("send-webhook", {
        endpointId: input.id,
        event: "ping",
        payload: {
          event: "ping",
          message: "Hello from Mimic AI! This is a test webhook.",
          timestamp: new Date().toISOString(),
        },
      });

      return { success: true };
    }),
});
