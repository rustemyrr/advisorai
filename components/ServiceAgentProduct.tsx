"use client";

import Link from "next/link";
import {
  BellRing,
  CalendarCheck,
  Check,
  PhoneCall,
  PhoneIncoming,
  ShieldCheck,
  X,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

/**
 * Public page for the customer-facing agent: /service-agent.
 *
 * Deliberately quiet about the technology and specific about the work -- the
 * reader is a shop owner deciding whether to hand the phone to a machine, so
 * the section about what the agent will NOT do carries as much weight as the
 * list of what it does.
 *
 * The console that exercises the agent lives at /service-agent/console and is
 * linked from here, not the other way round.
 */

const DOES_ICONS = [PhoneIncoming, CalendarCheck, BellRing, ShieldCheck, PhoneCall];

export default function ServiceAgentProduct() {
  const { t } = useLanguage();

  return (
    <>
      <section className="border-b border-gray-100 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <p className="text-sm font-medium text-gray-500">{t.saTag}</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
            {t.saHeadline}
          </h1>
          <p className="mt-4 max-w-3xl text-lg text-gray-700">{t.saSubtext}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href="#consultation"
              className="rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
            >
              {t.saCtaPrimary}
            </a>
            <Link
              href="/service-agent/console"
              className="rounded-md border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t.saCtaConsole}
            </Link>
          </div>
          <p className="mt-4 text-sm text-gray-500">{t.saNote}</p>
        </div>
      </section>

      <section className="border-b border-gray-100 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            {t.saDoesHeadline}
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {t.saDoesItems.map((item, index) => {
              const Icon = DOES_ICONS[index] ?? PhoneCall;
              return (
                <div
                  key={item.title}
                  className="rounded-xl border border-gray-200 bg-white p-6"
                >
                  <Icon className="h-6 w-6 text-gray-900" strokeWidth={1.5} aria-hidden />
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {item.text}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-gray-100 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            {t.saHowHeadline}
          </h2>

          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {t.saHowSteps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-900 text-sm font-medium text-white">
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

      <section className="border-b border-gray-100 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
            {t.saLimitsHeadline}
          </h2>

          <ul className="mt-8 grid max-w-4xl gap-3 sm:grid-cols-2">
            {t.saLimitsItems.map((item) => (
              <li
                key={item}
                className="flex gap-2.5 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700"
              >
                <X className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" strokeWidth={2} aria-hidden />
                <span className="leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>

          <p className="mt-6 flex max-w-3xl gap-2.5 text-sm text-gray-600">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-gray-900" strokeWidth={2} aria-hidden />
            <span className="leading-relaxed">{t.agentsHowText}</span>
          </p>
        </div>
      </section>
    </>
  );
}
