"use client";

import { useLanguage } from "@/lib/language-context";

export default function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section className="border-b border-gray-100 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-medium text-gray-500">{t.howTag}</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          {t.howHeadline}
        </h2>
        <p className="mt-4 max-w-3xl text-gray-600">{t.howSubtext}</p>
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {t.howSteps.map((step, index) => (
            <li
              key={step.title}
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-900 text-sm font-semibold text-white"
                aria-hidden
              >
                {index + 1}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
