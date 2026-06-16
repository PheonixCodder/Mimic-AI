import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function OAuthButtons() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">or continue with</span>
        <Separator className="flex-1" />
      </div>

      <div className="flex flex-col gap-2">
        <Link
          href="/api/auth/oauth/google"
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Continue with Google
        </Link>
        <Link
          href="/api/auth/oauth/github"
          className={cn(buttonVariants({ variant: "outline" }), "w-full")}
        >
          Continue with GitHub
        </Link>
      </div>
    </div>
  );
}
