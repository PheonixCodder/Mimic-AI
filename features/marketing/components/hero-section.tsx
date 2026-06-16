import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-24 pb-16">
      {/* Background radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, oklch(0.962 0.044 156.743 / 0.6) 0%, transparent 70%)",
        }}
      />

      {/* Badge */}
      <div className="mb-6 flex items-center gap-2 rounded-full border border-primary/20 bg-accent/60 px-4 py-1.5 text-xs font-medium text-accent-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Self-hosted AI video generation — own your infrastructure
      </div>

      {/* Headline */}
      <h1 className="max-w-4xl text-center text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
        Your AI Twin.{" "}
        <span
          className={cn(
            "bg-clip-text text-transparent",
            "bg-gradient-to-r from-primary via-emerald-500 to-primary"
          )}
        >
          Your Infrastructure.
        </span>{" "}
        Your Content.
      </h1>

      {/* Subheading */}
      <p className="mt-6 max-w-2xl text-center text-lg text-muted-foreground leading-relaxed">
        Clone your voice, create your avatar, and generate studio-quality videos — all running on compute you control. No black boxes. No vendor lock-in.
      </p>

      {/* CTAs */}
      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
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
          href="/#how-it-works"
          className={cn(buttonVariants({ size: "lg", variant: "outline" }), "min-w-44")}
        >
          See how it works
        </Link>
      </div>

      {/* Social proof line */}
      <p className="mt-8 text-xs text-muted-foreground">
        No credit card required · Deploy on your own GPU · Full source access
      </p>

      {/* Hero visual — dashboard mockup */}
      <div className="relative mt-16 w-full max-w-5xl">
        <div className="rounded-2xl border border-border bg-muted/40 shadow-2xl overflow-hidden">
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 border-b border-border bg-muted/60 px-4 py-3">
            <span className="h-3 w-3 rounded-full bg-red-400/70" />
            <span className="h-3 w-3 rounded-full bg-amber-400/70" />
            <span className="h-3 w-3 rounded-full bg-emerald-400/70" />
            <div className="ml-3 flex-1 rounded-md bg-background/60 px-3 py-1 text-xs text-muted-foreground">
              app.mimic-ai.com/dashboard
            </div>
          </div>
          {/* Mock dashboard content */}
          <div className="grid grid-cols-3 gap-0 divide-x divide-border">
            {/* Sidebar mock */}
            <div className="col-span-1 hidden sm:flex flex-col gap-2 p-4 bg-background/30">
              {["Dashboard", "Projects", "Voices", "Avatars", "Videos"].map((item) => (
                <div key={item} className="flex items-center gap-2 rounded-md px-2 py-1.5">
                  <div className="h-2 w-2 rounded-sm bg-muted-foreground/30" />
                  <span className="text-xs text-muted-foreground">{item}</span>
                </div>
              ))}
            </div>
            {/* Main content mock */}
            <div className="col-span-2 sm:col-span-2 p-6 space-y-4 min-h-48">
              <div className="flex items-center justify-between">
                <div className="h-4 w-24 rounded bg-muted-foreground/20" />
                <div className="h-7 w-20 rounded-md bg-primary/20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-border bg-background/40 p-3 space-y-2">
                    <div className="h-16 rounded-lg bg-accent/50" />
                    <div className="h-2.5 w-3/4 rounded bg-muted-foreground/20" />
                    <div className="h-2 w-1/2 rounded bg-muted-foreground/10" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Bottom fade */}
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 inset-x-0 h-24 bg-gradient-to-t from-background to-transparent"
        />
      </div>
    </section>
  );
}
