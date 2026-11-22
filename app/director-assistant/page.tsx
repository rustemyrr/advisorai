import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DirectorAssistantDemo from "@/components/DirectorAssistantDemo";

export const metadata: Metadata = {
  title: "AI assistant for the director — AdvisorAI",
  description:
    "Try a director assistant prototype with sample business metrics and plain-language questions.",
  alternates: { canonical: "/director-assistant" },
};

export default function DirectorAssistantPage() {
  return (
    <>
      <Navbar />
      <main>
        <DirectorAssistantDemo />
      </main>
      <Footer />
    </>
  );
}
