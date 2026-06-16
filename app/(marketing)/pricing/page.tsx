import type { Metadata } from "next";
import Link from "next/link";
import { Check, Minus, ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing — Mimic AI",
  description:
    "Simple, transparent pricing for every scale. Start free, upgrade when you need more.",
};

type PlanValue = boolean | string;

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    period: "/ month",
    description: "For individuals exploring AI video generation.",
    cta: "Get started free",
    href: "/signup",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/ month",
    description: "For creators who need volume, quality, and branding.",
    cta: "Start Pro",
    href: "/signup",
    highlighted: true,
  },
  {
    name: "Scale",
    price: "$99",
    period: "/ month",
    description: "For teams and high-volume production workflows.",
    cta: "Start Scale",
    href: "/signup",
    highlighted: false,
  },
];

const COMPARISON: { category: string; rows: { label: string; values: PlanValue[] }[] }[] = [
  {
    category: "Projects & Content",
    rows: [
      { label: "Projects", values: ["3", "Unlimited", "Unlimited"] },
      { label: "Videos / month", values: ["10", "50", "Unlimited"] },
      { label: "Video duration", values: ["5 min", "20 min", "Unlimited"] },
    ],
  },
  {
    category: "AI Assets",
    rows: [
      { label: "Cloned voices", values: ["1", "5", "Unlimited"] },
      { label: "AI avatars", values: ["1", "5", "Unlimited"] },
      { label: "Brand kits", values: [false, "3", "Unlimited"] },
      { label: "Templates", values: [false, true, true] },
    ],
  },
  {
    category: "Export & Quality",
    rows: [
      { label: "Max export resolution", values: ["720p", "1080p", "4K"] },
      { label: "Export formats", values: ["MP4", "MP4, MOV", "MP4, MOV, WebM"] },
      { label: "Custom watermark", values: [false, false, true] },
    ],
  },
  {
    category: "Platform",
    rows: [
      { label: "Workspace members", values: ["1", "3", "Unlimited"] },
      { label: "Webhook integrations", values: [false, false, true] },
      { label: "API access", values: [false, false, true] },
      { label: "Priority rendering", values: [false, true, true] },
    ],
  },
  {
    category: "Support",
    rows: [
      { label: "Community support", values: [true, true, true] },
      { label: "Email support", values: [false, true, true] },
      { label: "Priority support", values: [false, false, true] },
    ],
  },
];

function CellValue({ value }: { value: PlanValue }) {
  if (value === true) return <Check className="h-4 w-4 text-primary mx-auto" />;
  if (value === false) return <Minus className="h-4 w-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-sm text-foreground">{value}</span>;
}

export default function PricingPage() {
  return (
    <div className="pt-24 pb-24 px-6">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
            Pricing
          </p>
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Start free. No credit card required. Upgrade when you need more.
          </p>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 mb-20">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl p-8 ${
                plan.highlighted
                  ? "border-2 border-primary bg-card shadow-xl shadow-primary/10"
                  : "border border-border bg-card"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground whitespace-nowrap">
                  Most popular
                </div>
              )}
              <div className="mb-6">
                <h2 className="text-base font-semibold text-foreground mb-1">{plan.name}</h2>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-bold tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-sm text-muted-foreground mb-1">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground">{plan.description}</p>
              </div>
              <Link
                href={plan.href}
                className={cn(
                  buttonVariants({ variant: plan.highlighted ? "default" : "outline" }),
                  "w-full gap-2 mt-auto",
                  plan.highlighted && "bg-primary hover:bg-primary/90 text-primary-foreground"
                )}
              >
                {plan.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ))}
        </div>

        {/* Comparison table */}
        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="py-4 px-6 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-2/5">
                  Feature
                </th>
                {PLANS.map((p) => (
                  <th
                    key={p.name}
                    className={`py-4 px-4 text-center text-xs font-semibold uppercase tracking-wide ${
                      p.highlighted ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((section) => (
                <>
                  <tr key={section.category} className="bg-muted/20">
                    <td
                      colSpan={4}
                      className="py-3 px-6 text-xs font-semibold text-foreground uppercase tracking-wide"
                    >
                      {section.category}
                    </td>
                  </tr>
                  {section.rows.map((row, i) => (
                    <tr
                      key={row.label}
                      className={`border-t border-border/50 hover:bg-muted/20 transition-colors ${
                        i % 2 === 0 ? "" : "bg-muted/5"
                      }`}
                    >
                      <td className="py-3.5 px-6 text-sm text-muted-foreground">{row.label}</td>
                      {row.values.map((val, vi) => (
                        <td key={vi} className="py-3.5 px-4 text-center">
                          <CellValue value={val} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground mb-4">
            Need a custom plan for your enterprise team?
          </p>
          <Link
            href="mailto:hello@mimic-ai.com"
            className={buttonVariants({ variant: "outline" })}
          >
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
