import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    period: "/ month",
    description: "Perfect for individuals getting started.",
    features: [
      "3 projects",
      "1 cloned voice",
      "1 AI avatar",
      "10 videos / month",
      "720p export",
      "Community support",
    ],
    cta: "Get started free",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/ month",
    description: "For creators who need more volume and quality.",
    features: [
      "Unlimited projects",
      "5 cloned voices",
      "5 AI avatars",
      "50 videos / month",
      "1080p export",
      "Brand kits & templates",
      "Priority rendering",
      "Email support",
    ],
    cta: "Start Pro",
    href: "/signup",
    highlighted: true,
  },
  {
    name: "Scale",
    price: "$99",
    period: "/ month",
    description: "For teams and high-volume production workflows.",
    features: [
      "Everything in Pro",
      "Unlimited voices & avatars",
      "Unlimited videos",
      "4K export",
      "Custom watermarks",
      "Webhook integrations",
      "Team workspace",
      "Priority support",
    ],
    cta: "Start Scale",
    href: "/signup",
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-24 px-6 bg-muted/30">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Pricing
          </p>
          <h2 className="text-4xl font-bold tracking-tight text-foreground">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Start free, scale when you need. No hidden fees, no per-seat surprises.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl p-8 transition-all duration-200 ${
                plan.highlighted
                  ? "border-2 border-primary bg-card shadow-xl shadow-primary/10"
                  : "border border-border bg-card hover:shadow-md hover:border-primary/20"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                  Most popular
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-base font-semibold text-foreground mb-1">{plan.name}</h3>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground mb-1">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>

              <ul className="flex flex-col gap-2.5 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href={plan.href}
                className={cn(
                  buttonVariants({ variant: plan.highlighted ? "default" : "outline" }),
                  "w-full",
                  plan.highlighted && "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
          >
            View full plan comparison <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
