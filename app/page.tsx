import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import ProblemSection from "@/components/ProblemSection";
import Testimonials from "@/components/Testimonials";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";
import { PaddleProvider } from "@/components/PaddleProvider";
import { getPaddlePublicConfig } from "@/lib/paddle-public-config";

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
        <Testimonials />
        <Pricing />
        <FAQ />
        <CTASection />
      </main>
      <Footer />
    </PaddleProvider>
  );
}
