"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";

function PreferenceRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}

export function NotificationsPanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(trpc.profile.getMe.queryOptions());

  const prefs = (data?.profile as any)?.notification_preferences ?? {
    video_render: true,
    billing_alerts: true,
  };

  const [videoRender, setVideoRender] = useState<boolean | null>(null);
  const [billingAlerts, setBillingAlerts] = useState<boolean | null>(null);
  const [initialized, setInitialized] = useState(false);

  if (data && !initialized) {
    setVideoRender(prefs.video_render ?? true);
    setBillingAlerts(prefs.billing_alerts ?? true);
    setInitialized(true);
  }

  const updateMutation = useMutation(
    trpc.profile.updatePreferences.mutationOptions({
      onSuccess: () => {
        toast.success("Preferences saved");
        queryClient.invalidateQueries(trpc.profile.getMe.queryFilter());
      },
      onError: (err: { message?: string }) => {
        toast.error(err.message ?? "Failed to save preferences");
      },
    })
  );

  const handleChange = (key: "videoRender" | "billingAlerts", val: boolean) => {
    const next = {
      videoRender: key === "videoRender" ? val : (videoRender ?? true),
      billingAlerts: key === "billingAlerts" ? val : (billingAlerts ?? true),
    };
    if (key === "videoRender") setVideoRender(val);
    else setBillingAlerts(val);
    updateMutation.mutate(next);
  };

  const saving = updateMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bell className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground tracking-tight">Notifications</h2>
        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
      </div>
      <Separator />

      <div className="space-y-1 divide-y divide-border max-w-lg">
        <PreferenceRow
          id="notif-video-render"
          label="Video render complete"
          description="Get an email when your video finishes rendering."
          checked={videoRender ?? true}
          onCheckedChange={(val) => handleChange("videoRender", val)}
          disabled={isLoading || saving}
        />
        <PreferenceRow
          id="notif-billing-alerts"
          label="Billing alerts"
          description="Receive email notifications for invoices and usage thresholds."
          checked={billingAlerts ?? true}
          onCheckedChange={(val) => handleChange("billingAlerts", val)}
          disabled={isLoading || saving}
        />
      </div>
    </div>
  );
}
