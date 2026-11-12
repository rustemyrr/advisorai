import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import AgentsSection from "@/components/AgentsSection";
import ConsultationForm from "@/components/ConsultationForm";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Агенты для специалистов — AdvisorAI",
  description:
    "ИИ ассистент директора и ИИ СММ-монтажёр: узкие агенты, которые снимают рутину с автосервиса и небольшой команды.",
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
