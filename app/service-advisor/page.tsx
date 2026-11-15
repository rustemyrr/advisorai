import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProblemSection from "@/components/ProblemSection";
import HowItWorks from "@/components/HowItWorks";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { PaddleProvider } from "@/components/PaddleProvider";
import { getPaddlePublicConfig } from "@/lib/paddle-public-config";

// This was the landing page until 2026-11-15. The home page is now about the
// agents, and the service-advisor SaaS -- the demo, the plans, the checkout --
// lives here as a product of its own.
export const metadata: Metadata = {
  title: "AI for automotive service advisors — AdvisorAI",
  description:
    "Turn repair notes into customer estimates, plain-language explanations, and upsell suggestions in seconds.",
  alternates: { canonical: "/service-advisor" },
};

/** Read .env.local at request time — not at static build time. */
export const dynamic = "force-dynamic";

export default function ServiceAdvisorPage() {
  const paddleConfig = getPaddlePublicConfig();

  return (
    <PaddleProvider config={paddleConfig}>
      <Navbar />
      <main>
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </PaddleProvider>
  );
}
