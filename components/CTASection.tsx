"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/language-context";

export default function CTASection() {
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className="py-16 sm:py-20">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          {t.ctaHeadline}
        </h2>
        <p className="mt-4 text-gray-600">{t.ctaSubtext}</p>
        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <input
            type="email"
            required
            placeholder={t.ctaEmailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 sm:min-w-[280px]"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            {submitted ? t.ctaThanks : t.ctaButton}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-500">{t.ctaNote}</p>
      </div>
    </section>
  );
}
