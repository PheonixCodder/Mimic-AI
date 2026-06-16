import { z } from "zod";

export const WEBHOOK_EVENTS = [
  "job.queued",
  "job.running",
  "job.completed",
  "job.failed",
  "job.cancelled",
  "ping",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const webhookEndpointInputSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "URL is required")
    .url("Invalid URL format")
    .refine(
      (val) => val.startsWith("http://") || val.startsWith("https://"),
      "URL must start with http:// or https://",
    ),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or less")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  active: z.boolean().default(true),
  events: z
    .array(z.enum(WEBHOOK_EVENTS))
    .min(1, "Select at least one event to subscribe to"),
});

export type WebhookEndpointInput = z.infer<typeof webhookEndpointInputSchema>;

export type WebhookEndpointRow = {
  id: string;
  workspace_id: string;
  url: string;
  secret: string;
  description: string | null;
  active: boolean;
  events: WebhookEvent[];
  created_at: string;
  updated_at: string;
};

export type WebhookDeliveryRow = {
  id: string;
  endpoint_id: string;
  event: string;
  payload: any;
  request_headers: Record<string, string> | null;
  response_headers: Record<string, string> | null;
  response_body: string | null;
  status_code: number | null;
  duration_ms: number | null;
  success: boolean;
  created_at: string;
};
