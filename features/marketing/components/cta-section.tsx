import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CtaSection() {
  return (
    <section className="py-24 px-6">
      <div className="mx-auto max-w-4xl">
        <div
          className="relative overflow-hidden rounded-3xl px-8 py-16 text-center"
          style={{
            background:
              "radial-gradient(ellipse 120% 80% at 50% 50%, oklch(0.962 0.044 156.743 / 0.7) 0%, oklch(0.984 0.003 247.858 / 0.3) 60%, transparent 100%)",
          }}
        >
          <div className="absolute inset-0 rounded-3xl border border-primary/20 pointer-events-none" />
          <div aria-hidden className="absolute top-6 left-8 h-2 w-2 rounded-full bg-primary/30" />
          <div aria-hidden className="absolute top-8 right-12 h-1.5 w-1.5 rounded-full bg-primary/20" />
          <div aria-hidden className="absolute bottom-8 left-16 h-1.5 w-1.5 rounded-full bg-primary/20" />
          <div aria-hidden className="absolute bottom-6 right-8 h-2 w-2 rounded-full bg-primary/30" />

          <h2 className="text-4xl font-bold tracking-tight text-foreground max-w-2xl mx-auto">
            Ready to build your AI video studio?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Start generating videos in minutes. No credit card required. Full source access included.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className={cn(
                buttonVariants({ size: "lg" }),
                "min-w-44 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
              )}
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }), "min-w-44")}
            >
              View pricing
            </Link>
          </div>

          <p className="mt-6 text-xs text-muted-foreground">
            Deploy on your own infrastructure · GDPR compliant · Open source friendly
          </p>
        </div>
      </div>
    </section>
  );
}
