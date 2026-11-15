"use client";

import Link from "next/link";
import { ArrowRight, Check, type LucideIcon } from "lucide-react";

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
 */
export default function AgentCard({
  icon: Icon,
  title,
  text,
  bullets,
  href,
  cta,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  bullets: readonly string[];
  href?: string;
  cta?: string;
}) {
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

      {href && cta && (
        // mt-auto pins the link to the bottom edge, so it lines up across
        // cards of different heights instead of floating mid-card.
        <Link
          href={href}
          className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-medium text-gray-900 hover:gap-2.5"
        >
          {cta}
          <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
        </Link>
      )}
    </div>
  );
}
