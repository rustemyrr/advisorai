"use client";

import Link from "next/link";
import { ArrowRight, Wrench } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

/**
 * The service-advisor SaaS, as seen from the agents home page: one block that
 * says what it is and sends you to /service-advisor, where the demo, the plans
 * and the checkout live.
 */
export default function SecondProduct() {
  const { t } = useLanguage();

  return (
    <section className="border-b border-gray-100 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-medium text-gray-500">{t.secondProductTag}</p>
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 sm:p-8">
          <Wrench className="h-6 w-6 text-gray-900" strokeWidth={1.5} aria-hidden />
          <h2 className="mt-4 text-xl font-semibold text-gray-900 sm:text-2xl">
            {t.secondProductTitle}
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-gray-600">
            {t.secondProductText}
          </p>
          <Link
            href="/service-advisor"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            {t.secondProductCta}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
