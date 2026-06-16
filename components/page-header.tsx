import { Headphones, ThumbsUp } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-b px-4 py-4",
        className,
      )}
    >
      <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="mailto:hello@mimic.ai" />}
        >
          <ThumbsUp />
          <span className="hidden lg:inline">Feedback</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href="mailto:hello@mimic.ai" />}
        >
          <Headphones />
          <span className="hidden lg:inline">Need help?</span>
        </Button>
      </div>
    </div>
  );
}
