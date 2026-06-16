"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { User, Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";

export function ProfilePanel() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(trpc.profile.getMe.queryOptions());

  const [displayName, setDisplayName] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Hydrate input once data arrives
  if (data && !initialized) {
    setDisplayName(data.profile?.display_name ?? "");
    setInitialized(true);
  }

  const updateMutation = useMutation(
    trpc.profile.updateProfile.mutationOptions({
      onSuccess: () => {
        toast.success("Profile updated");
        queryClient.invalidateQueries(trpc.profile.getMe.queryFilter());
      },
      onError: (err: { message?: string }) => {
        toast.error(err.message ?? "Failed to update profile");
      },
    })
  );

  const handleSave = () => {
    if (!displayName.trim()) return;
    updateMutation.mutate({ displayName: displayName.trim() });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-semibold text-foreground tracking-tight">Profile</h2>
      </div>
      <Separator />

      <div className="space-y-4 max-w-sm">
        {/* Email — read-only from auth */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-email" className="text-xs text-muted-foreground">
            Email
          </Label>
          <Input
            id="profile-email"
            value={isLoading ? "" : (data?.user?.email ?? "")}
            disabled
            className="bg-muted/40 text-muted-foreground text-sm"
          />
          <p className="text-[11px] text-muted-foreground">
            Email is managed by your authentication provider.
          </p>
        </div>

        {/* Display name */}
        <div className="space-y-1.5">
          <Label htmlFor="profile-display-name" className="text-xs font-medium">
            Display name
          </Label>
          <Input
            id="profile-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            disabled={isLoading || updateMutation.isPending}
            className="text-sm"
            maxLength={80}
          />
        </div>

        <Button
          size="sm"
          className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={handleSave}
          disabled={isLoading || updateMutation.isPending || !displayName.trim()}
          id="profile-save-btn"
        >
          {updateMutation.isPending ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
          ) : (
            <><Save className="h-3.5 w-3.5" /> Save changes</>
          )}
        </Button>
      </div>
    </div>
  );
}
