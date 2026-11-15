"use client";

import { BarChart3, Check, Clapperboard } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function AgentsSection() {
  const { t } = useLanguage();

  const agents = [
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

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {agents.map((agent) => (
            <div
              key={agent.title}
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <agent.icon
                className="h-6 w-6 text-gray-900"
                strokeWidth={1.5}
                aria-hidden
              />
              <h2 className="mt-4 text-lg font-semibold text-gray-900">
                {agent.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {agent.text}
              </p>
              <ul className="mt-5 space-y-2.5">
                {agent.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-2.5 text-sm text-gray-700">
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-gray-900"
                      strokeWidth={2}
                      aria-hidden
                    />
                    <span className="leading-relaxed">{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
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
