"use client";

import DemoWidget from "./DemoWidget";
import { useLanguage } from "@/lib/language-context";

export default function Hero() {
  const { t } = useLanguage();

  return (
    <section id="hero" className="border-b border-gray-100">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="mb-4 inline-block rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700">
          {t.heroTag}
        </p>
        <h1 className="max-w-3xl text-[2.5rem] font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl">
          {t.heroHeadline}
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-gray-600">{t.heroSubtext}</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="#demo"
            className="inline-flex justify-center rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            {t.heroCta}
          </a>
          <a
            href="#demo"
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            {t.heroDemo}
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-500">{t.heroNote}</p>
        <div id="demo" className="mt-12">
          <DemoWidget />
        </div>
      </div>
    </section>
  );
}
