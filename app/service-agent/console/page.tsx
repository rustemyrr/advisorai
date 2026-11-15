import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ServiceAgentConsole from "@/components/ServiceAgentConsole";

// Where the agent is exercised before it is pointed at a real phone line:
// talk to it as a customer would, see which tools it used, run the reminder
// pass by hand. Signed in only, and kept out of the sitemap and the index --
// the public page for this product is /service-agent.
export const metadata: Metadata = {
  title: "Консоль агента автосервиса — AdvisorAI",
  description:
    "Проверка агента, который разговаривает с клиентами, записывает на сервис и напоминает о ТО и окончании гарантии.",
  alternates: { canonical: "/service-agent/console" },
  robots: { index: false, follow: false },
};

export default function ServiceAgentConsolePage() {
  return (
    <>
      <Navbar />
      <main>
        <ServiceAgentConsole />
      </main>
      <Footer />
    </>
  );
}
