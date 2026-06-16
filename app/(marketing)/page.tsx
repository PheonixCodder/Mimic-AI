import type { Metadata } from "next";
import { HeroSection } from "@/features/marketing/components/hero-section";
import { FeaturesSection } from "@/features/marketing/components/features-section";
import { HowItWorksSection } from "@/features/marketing/components/how-it-works-section";
import { ExamplesSection } from "@/features/marketing/components/examples-section";
import { PricingSection } from "@/features/marketing/components/pricing-section";
import { CtaSection } from "@/features/marketing/components/cta-section";

export const metadata: Metadata = {
  title: "Mimic AI — Your AI Twin. Your Infrastructure. Your Content.",
  description:
    "Self-hosted AI video studio. Clone voices, create avatars, and generate studio-quality videos on infrastructure you control. No vendor lock-in.",
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ExamplesSection />
      <PricingSection />
      <CtaSection />
    </>
  );
}
