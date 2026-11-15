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

// Title and description are inherited from app/layout.tsx; this is only here
// to state the canonical URL of the landing page.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/** Read .env.local at request time — not at static build time. */
export const dynamic = "force-dynamic";

export default function Home() {
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
