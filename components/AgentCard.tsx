"use client";

import Link from "next/link";
import { ArrowRight, Check, type LucideIcon } from "lucide-react";
import {
  CONSULTATION_PREFILL_EVENT,
  type ConsultationPrefillDetail,
} from "@/lib/consultation-prefill";
import { useLanguage } from "@/lib/language-context";

/**
 * One card in either of the two blocks on the home page.
 *
 * Shared because the two blocks say different things about different kinds of
 * work -- an assistant that makes a person faster, an agent that holds a role
 * in the process -- but a reader comparing them should be comparing the offers,
 * not two slightly different card designs.
 *
 * `href` + `cta` are optional: only an agent with a page of its own carries a
 * link, and that link is the way into the page.
 *
 * `requestFor` adds the "leave a request" button. It names the agent, which
 * travels to the form so the request says what it is about -- every card leads
 * to the same form, and without the name a lead is a phone number with no
 * product attached.
 */
export default function AgentCard({
  icon: Icon,
  title,
  text,
  bullets,
  href,
  cta,
  requestFor,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  bullets: readonly string[];
  href?: string;
  cta?: string;
  requestFor?: string;
}) {
  const { t } = useLanguage();

  // The anchor still does the scrolling; this only tells the form what the
  // request is about, so the button keeps working if the script does not.
  function announce() {
    if (!requestFor) return;
    window.dispatchEvent(
      new CustomEvent<ConsultationPrefillDetail>(CONSULTATION_PREFILL_EVENT, {
        detail: { about: requestFor },
      })
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-gray-200 bg-white p-6">
      <Icon className="h-6 w-6 text-gray-900" strokeWidth={1.5} aria-hidden />
      <h3 className="mt-4 text-lg font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{text}</p>
      <ul className="mt-5 space-y-2.5">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2.5 text-sm text-gray-700">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-gray-900"
              strokeWidth={2}
              aria-hidden
            />
            <span className="leading-relaxed">{bullet}</span>
          </li>
        ))}
      </ul>

      {(requestFor || (href && cta)) && (
        // mt-auto pins the actions to the bottom edge, so they line up across
        // cards of different heights instead of floating mid-card.
        <div className="mt-auto flex flex-wrap items-center gap-x-5 gap-y-3 pt-6">
          {requestFor && (
            <a
              href="#consultation"
              onClick={announce}
              className="inline-flex items-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-900 hover:border-gray-400 hover:bg-gray-50"
            >
              {t.agentRequestCta}
            </a>
          )}
          {href && cta && (
            <Link
              href={href}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900 hover:gap-2.5"
            >
              {cta}
              <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
