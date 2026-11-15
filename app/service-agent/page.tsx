import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConsultationForm from "@/components/ConsultationForm";
import ServiceAgentProduct from "@/components/ServiceAgentProduct";

// Public page for the customer-facing agent: the one that answers the phone,
// books and confirms appointments, and calls about a due service or a warranty
// about to end. The console that exercises it is at /service-agent/console and
// stays signed-in only.
export const metadata: Metadata = {
  title: "Агент для автосервиса: отвечает на звонки и записывает — AdvisorAI",
  description:
    "Агент разговаривает с клиентами по телефону: консультирует по обслуживанию, записывает на сервис, подтверждает запись и сам звонит, когда подошёл срок ТО или заканчивается гарантия. Работает на вашем номере и с вашей базой — CRM или 1С.",
  alternates: { canonical: "/service-agent" },
};

export default function ServiceAgentPage() {
  return (
    <>
      <Navbar />
      <main>
        <ServiceAgentProduct />
        <ConsultationForm source="service-agent" />
      </main>
      <Footer />
    </>
  );
}
