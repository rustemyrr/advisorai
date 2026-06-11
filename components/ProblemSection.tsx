"use client";

import { Clock, MessageCircle, TrendingUp } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

export default function ProblemSection() {
  const { t } = useLanguage();

  const cards = [
    { icon: Clock, title: t.card1Title, text: t.card1Text },
    { icon: MessageCircle, title: t.card2Title, text: t.card2Text },
    { icon: TrendingUp, title: t.card3Title, text: t.card3Text },
  ];

  return (
    <section className="border-b border-gray-100 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-medium text-gray-500">{t.problemTag}</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          {t.problemHeadline}
        </h2>
        <p className="mt-4 max-w-3xl text-gray-600">{t.problemSubtext}</p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <card.icon
                className="h-6 w-6 text-gray-900"
                strokeWidth={1.5}
                aria-hidden
              />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {card.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
