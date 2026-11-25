"use client";

import { Handshake, HeartPulse, Inbox, PhoneCall, Store } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import AgentCard from "@/components/AgentCard";

/**
 * Agents that hold a business role, as opposed to the assistants above: the
 * agent is not beside the employee, it is the function -- it talks to the
 * customer, decides inside the rules the shop sets, and carries the job to a
 * result.
 *
 * The order is deliberate: the two that answer a channel end to end come
 * first, then the two that work a pipeline. Each one names the moment it
 * refuses to decide and hands over to a person -- that boundary is the offer
 * as much as the capability is.
 */
export default function BusinessAgentsSection() {
  const { t } = useLanguage();

  const agents = [
    {
      icon: PhoneCall,
      title: t.agentServiceTitle,
      text: t.agentServiceText,
      bullets: t.agentServiceBullets,
      href: "/service-agent",
      cta: t.agentServiceCta,
    },
    {
      icon: HeartPulse,
      title: t.agentClinicTitle,
      text: t.agentClinicText,
      bullets: t.agentClinicBullets,
    },
    {
      icon: Store,
      title: t.agentShopTitle,
      text: t.agentShopText,
      bullets: t.agentShopBullets,
    },
    {
      icon: Inbox,
      title: t.agentLeadTitle,
      text: t.agentLeadText,
      bullets: t.agentLeadBullets,
    },
    {
      icon: Handshake,
      title: t.agentSalesTitle,
      text: t.agentSalesText,
      bullets: t.agentSalesBullets,
    },
  ];

  return (
    <section className="border-b border-gray-100 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          {t.businessAgentsHeadline}
        </h2>
        <p className="mt-3 max-w-3xl text-lg text-gray-700 sm:text-xl">
          {t.businessAgentsSubtitle}
        </p>
        <p className="mt-5 max-w-3xl text-gray-600">{t.businessAgentsSubtext}</p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <AgentCard key={agent.title} {...agent} requestFor={agent.title} />
          ))}
        </div>
      </div>
    </section>
  );
}
