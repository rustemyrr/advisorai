"use client";

import { BarChart3, Clapperboard, Wrench } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import AgentCard from "@/components/AgentCard";

/**
 * Assistants: they make one person faster at work that person still does.
 * The director still runs the shop, the owner still films the video -- the
 * assistant takes the part that eats the evening.
 *
 * Agents that hold a role in the process on their own are a different offer
 * and live in their own block (components/BusinessAgentsSection.tsx).
 */
export default function AgentsSection() {
  const { t } = useLanguage();

  const assistants = [
    {
      icon: BarChart3,
      title: t.agentDirectorTitle,
      text: t.agentDirectorText,
      bullets: t.agentDirectorBullets,
    },
    {
      icon: Clapperboard,
      title: t.agentSmmTitle,
      text: t.agentSmmText,
      bullets: t.agentSmmBullets,
    },
    // The service-advisor SaaS: an assistant like the other two -- the advisor
    // still writes the estimate, this takes the writing. Its card is the way
    // into the product page, where the demo, the plans and the checkout live.
    {
      icon: Wrench,
      title: t.agentAdvisorTitle,
      text: t.agentAdvisorText,
      bullets: t.agentAdvisorBullets,
      href: "/service-advisor",
      cta: t.agentAdvisorCta,
    },
  ];

  return (
    <section className="border-b border-gray-100 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          {t.agentsHeadline}
        </h1>
        <p className="mt-3 max-w-3xl text-lg text-gray-700 sm:text-xl">
          {t.agentsSubtitle}
        </p>
        <p className="mt-5 max-w-3xl text-gray-600">{t.agentsSubtext}</p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {assistants.map((assistant) => (
            <AgentCard key={assistant.title} {...assistant} />
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-6">
          <p className="text-sm font-medium text-gray-500">{t.agentsHowTag}</p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-700">
            {t.agentsHowText}
          </p>
        </div>
      </div>
    </section>
  );
}
