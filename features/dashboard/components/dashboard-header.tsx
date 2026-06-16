"use client";

import { useQuery } from "@tanstack/react-query";
import { Headphones, ThumbsUp } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getDisplayName } from "@/features/dashboard/lib/display-name";
import { useTRPC } from "@/trpc/client";

export function DashboardHeader() {
  const trpc = useTRPC();
  const { data } = useQuery(trpc.profile.getMe.queryOptions());

  const displayName = getDisplayName(data?.profile, data?.user);

  return (
    <div className="flex items-start justify-between">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">Nice to see you</p>
        <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
          {displayName}
        </h1>
      </div>

      <div className="hidden items-center gap-3 lg:flex">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="mailto:hello@mimic.ai" />}
        >
          <ThumbsUp />
          Feedback
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="mailto:hello@mimic.ai" />}
        >
          <Headphones />
          Need help?
        </Button>
      </div>
    </div>
  );
}
