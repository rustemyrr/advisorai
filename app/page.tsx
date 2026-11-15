import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AgentsSection from "@/components/AgentsSection";
import BusinessAgentsSection from "@/components/BusinessAgentsSection";
import ConsultationForm from "@/components/ConsultationForm";
import Footer from "@/components/Footer";

// Title and description are inherited from app/layout.tsx; this is only here
// to state the canonical URL of the home page.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <AgentsSection />
        <BusinessAgentsSection />
        <ConsultationForm />
      </main>
      <Footer />
    </>
  );
}
