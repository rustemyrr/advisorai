"use client";

import { useLanguage } from "@/lib/language-context";

export default function Testimonials() {
  const { t } = useLanguage();

  return (
    <section className="border-b border-gray-100 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-medium text-gray-500">{t.testimonialsTag}</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          {t.testimonialsHeadline}
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {t.testimonials.map((item) => (
            <blockquote
              key={item.name}
              className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8"
            >
              <p className="text-gray-700">&ldquo;{item.quote}&rdquo;</p>
              <footer className="mt-6">
                <p className="font-semibold text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">{item.role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
