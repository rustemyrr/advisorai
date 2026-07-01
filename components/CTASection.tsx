"use client";

import { useLanguage } from "@/lib/language-context";

export default function CTASection() {
  const { t } = useLanguage();

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          {t.ctaHeadline}
        </h2>
        <p className="mt-4 text-gray-600">{t.ctaSubtext}</p>
        <div className="mt-8 flex justify-center">
          <a
            href="#pricing"
            className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            {t.ctaButton}
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-500">{t.ctaNote}</p>
      </div>
    </section>
  );
}
