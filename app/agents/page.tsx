import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AgentsSection from "@/components/AgentsSection";
import ConsultationForm from "@/components/ConsultationForm";
import Footer from "@/components/Footer";

// The page body renders in English until the visitor flips the language
// toggle, because that is where lib/language-context.tsx starts and the
// choice lives in localStorage, which the server cannot read. So the
// metadata is English like every other page's (see app/layout.tsx) —
// a Russian title over an English page was the one thing out of step.
export const metadata: Metadata = {
  title: "Agents for pros — AdvisorAI",
  description:
    "The ones that make you more effective and make your life simpler: an AI assistant for the director and an AI SMM editor.",
};

export default function AgentsPage() {
  return (
    <>
      <Navbar />
      <main>
        <AgentsSection />
        <ConsultationForm />
      </main>
      <Footer />
    </>
  );
}
