import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WEBHOOK_EVENTS, type WebhookEvent } from "@/features/webhooks/lib/schemas";

type WebhookEndpoint = {
  id: string;
  url: string;
  secret: string;
  description: string | null;
  active: boolean;
  events: WebhookEvent[];
};

type WebhookDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhook?: WebhookEndpoint | null;
  onSubmit: (values: {
    url: string;
    description: string;
    active: boolean;
    events: WebhookEvent[];
  }) => Promise<void>;
};

const EVENT_DESCRIPTIONS: Record<WebhookEvent, string> = {
  "job.queued": "Triggered when a generation or render job is created and queued.",
  "job.running": "Triggered when a job starts active processing.",
  "job.completed": "Triggered when a job is successfully finished.",
  "job.failed": "Triggered when a job encounters an error and fails.",
  "job.cancelled": "Triggered when a job is manually cancelled by a user.",
  ping: "A test event used to verify your endpoint reception.",
};

export function WebhookDialog({
  open,
  onOpenChange,
  webhook,
  onSubmit,
}: WebhookDialogProps) {
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);
  const [isPending, setIsPending] = useState(false);

  const isEditing = Boolean(webhook);

  // Filter out the 'ping' event from standard selections, as it's triggered manually
  const availableEvents = WEBHOOK_EVENTS.filter((e) => e !== "ping");

  useEffect(() => {
    if (open) {
      setUrl(webhook?.url ?? "");
      setDescription(webhook?.description ?? "");
      setActive(webhook?.active ?? true);
      setSelectedEvents(
        (webhook?.events as WebhookEvent[]) ?? ["job.completed", "job.failed"],
      );
    }
  }, [open, webhook]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setUrl("");
      setDescription("");
      setActive(true);
      setSelectedEvents([]);
    }
    onOpenChange(nextOpen);
  }

  function handleCheckboxChange(event: WebhookEvent, checked: boolean) {
    if (checked) {
      setSelectedEvents((prev) => [...prev, event]);
    } else {
      setSelectedEvents((prev) => prev.filter((e) => e !== event));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedEvents.length === 0) {
      toast.error("Please select at least one event type to subscribe to");
      return;
    }

    setIsPending(true);
    try {
      await onSubmit({
        url,
        description,
        active,
        events: selectedEvents,
      });
      handleOpenChange(false);
      toast.success(isEditing ? "Webhook endpoint updated" : "Webhook endpoint created");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save webhook endpoint",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Webhook Endpoint" : "Add Webhook Endpoint"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the destination URL and event subscriptions."
              : "Register an HTTP POST endpoint to receive real-time updates from Mimic AI."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="webhook-url">Endpoint URL</FieldLabel>
              <Input
                id="webhook-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.yourcompany.com/webhooks/mimic"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="webhook-description">Description</FieldLabel>
              <Textarea
                id="webhook-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description of this webhook's purpose..."
                rows={3}
                maxLength={1000}
              />
            </Field>

            <div className="space-y-3">
              <span className="text-sm font-semibold tracking-tight text-foreground">
                Event Subscriptions
              </span>
              <div className="grid gap-3 rounded-lg border border-border p-4">
                {availableEvents.map((event) => {
                  const isChecked = selectedEvents.includes(event);
                  return (
                    <label
                      key={event}
                      className="flex items-start gap-3 text-sm cursor-pointer select-none group"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => handleCheckboxChange(event, e.target.checked)}
                        className="mt-0.5 size-4 shrink-0 rounded border-input text-primary focus:ring-primary cursor-pointer"
                      />
                      <div className="space-y-0.5">
                        <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                          {event}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {EVENT_DESCRIPTIONS[event]}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                id="webhook-active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="size-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
              />
              <label
                htmlFor="webhook-active"
                className="text-sm font-medium cursor-pointer select-none"
              >
                Enable this endpoint (Active)
              </label>
            </div>
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? "Saving..."
                : isEditing
                ? "Save Changes"
                : "Add Endpoint"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
