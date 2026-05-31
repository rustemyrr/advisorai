import { Clock, MessageCircle, TrendingUp } from "lucide-react";

const cards = [
  {
    icon: Clock,
    title: "15 min per estimate → 30 sec",
    text: "Stop building estimates from scratch. Generate a complete, professional quote instantly.",
  },
  {
    icon: MessageCircle,
    title: "Technical jargon → plain English",
    text: "One click turns 'DMTL solenoid failure' into something your customer actually understands.",
  },
  {
    icon: TrendingUp,
    title: "Never miss an upsell again",
    text: "AI spots the right moment to offer extras based on mileage, job type, and customer history.",
  },
];

export default function ProblemSection() {
  return (
    <section className="border-b border-gray-100 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-medium text-gray-500">The problem</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Service advisors waste 20% of their day on paperwork, not customers.
        </h2>
        <p className="mt-4 max-w-3xl text-gray-600">
          Writing estimates, finding the right words for a non-technical customer,
          figuring out what to upsell — it all takes time and skill most advisors
          learn over years. AdvisorAI gives you that skill on day one.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {cards.map((card) => (
            <div
              key={card.title}
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <card.icon
                className="h-6 w-6 text-gray-900"
                strokeWidth={1.5}
                aria-hidden
              />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                {card.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
