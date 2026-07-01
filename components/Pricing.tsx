"use client";

import { useEffect } from "react";
import { Check } from "lucide-react";
import ProCheckoutButton from "./ProCheckoutButton";
import { unlockPagePointerEvents } from "@/lib/paddle-client";
import { useLanguage } from "@/lib/language-context";
import { usePaddle } from "./PaddleProvider";

export default function Pricing() {
  const { t } = useLanguage();
  const { config } = usePaddle();

  useEffect(() => {
    unlockPagePointerEvents();
  }, []);

  const plans = [
    {
      name: t.planStarter,
      price: "$4",
      period: t.perMonth,
      featured: false,
      paddleCheckout: true,
      features: t.starterFeatures,
      cta: t.ctaGetStarted,
      ctaStyle: "outline" as const,
      href: undefined,
      priceId: config.priceIdStarter,
    },
    {
      name: t.planStandard,
      price: "$19",
      period: t.perMonth,
      featured: true,
      paddleCheckout: true,
      features: t.standardFeatures,
      cta: t.ctaSubscribe,
      ctaStyle: "primary" as const,
      href: undefined,
      priceId: config.priceId,
    },
    {
      name: t.planProfessional,
      price: "$28",
      period: t.perMonth,
      featured: false,
      paddleCheckout: true,
      features: t.professionalFeatures,
      cta: t.ctaSubscribe,
      ctaStyle: "outline" as const,
      href: undefined,
      priceId: config.priceIdProfessional || config.priceId,
    },
  ];

  return (
    <section
      id="pricing"
      className="relative border-b border-gray-100 py-16 sm:py-20 [pointer-events:auto]"
    >
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-medium text-gray-500">{t.pricingTag}</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          {t.pricingHeadline}
        </h2>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => {
            const outlineClass =
              "mt-8 block w-full cursor-pointer rounded-md border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-900 hover:bg-gray-50 [pointer-events:auto]";

            return (
              <div
                key={plan.name}
                className={`relative flex min-h-0 flex-col rounded-xl border bg-white p-6 pt-8 [pointer-events:auto] ${
                  plan.featured
                    ? "z-20 border-2 border-gray-900 shadow-sm"
                    : "z-0 border-gray-200"
                }`}
              >
                {plan.featured && (
                  <span className="pointer-events-none absolute -top-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-gray-900 px-3 py-0.5 text-xs font-medium text-white">
                    {t.mostPopular}
                  </span>
                )}
                <h3 className="text-lg font-semibold text-gray-900">
                  {plan.name}
                </h3>
                <p className="mt-2">
                  <span className="text-3xl font-semibold text-gray-900">
                    {plan.price}
                  </span>
                  <span className="text-gray-500">{plan.period}</span>
                </p>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-gray-600"
                    >
                      <Check
                        className="mt-0.5 h-4 w-4 shrink-0 text-gray-900"
                        aria-hidden
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
                <ProCheckoutButton label={plan.cta} priceId={plan.priceId} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
