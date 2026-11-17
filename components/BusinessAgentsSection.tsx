"use client";

import { PhoneCall } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import AgentCard from "@/components/AgentCard";

/**
 * Agents that hold a business role, as opposed to the assistants above: the
 * agent is not beside the employee, it is the function -- it talks to the
 * customer, decides inside the rules the shop sets, and carries the job to a
 * result.
 *
 * One card today (the car-service front desk); the block exists because the
 * distinction is the offer, not because the list is long.
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

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard key={agent.title} {...agent} requestFor={agent.title} />
          ))}
        </div>
      </div>
    </section>
  );
}
