import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AgentsSection from "@/components/AgentsSection";
import ConsultationForm from "@/components/ConsultationForm";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Агенты для профессионалов — AdvisorAI",
  description:
    "Те, кто делает вас эффективнее и упрощает вашу жизнь: ИИ ассистент директора и ИИ СММ-монтажёр.",
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
