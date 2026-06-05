"use client";

import { useState } from "react";

export default function CTASection() {
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
          Try AdvisorAI free today.
        </h2>
        <p className="mt-4 text-gray-600">
          Join service advisors in UAE, UK, and US who write better estimates in
          less time.
        </p>
        <form
          onSubmit={handleSubmit}
          className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
        >
          <input
            type="email"
            required
            placeholder="you@dealership.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 sm:min-w-[280px]"
          />
          <button
            type="submit"
            className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            {submitted ? "Thanks!" : "Start free"}
          </button>
        </form>
        <p className="mt-4 text-sm text-gray-500">
          Free to start · No credit card required
        </p>
      </div>
    </section>
  );
}
