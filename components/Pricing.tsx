import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    period: "/forever",
    featured: false,
    features: [
      "5 estimates per day",
      "Plain-language explainer",
      "No upsell suggestions",
      "No estimate history",
    ],
    cta: "Get started",
    ctaStyle: "outline" as const,
  },
  {
    name: "Pro",
    price: "$29",
    period: "/month",
    featured: true,
    features: [
      "Unlimited estimates",
      "Plain-language explainer",
      "AI upsell suggestions",
      "Full estimate history",
    ],
    cta: "Start 7-day free trial",
    ctaStyle: "primary" as const,
  },
  {
    name: "Team",
    price: "$99",
    period: "/month",
    featured: false,
    features: [
      "Everything in Pro",
      "Up to 5 advisors",
      "Team dashboard",
      "Manager analytics",
      "Priority support",
    ],
    cta: "Contact us",
    ctaStyle: "outline" as const,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" className="border-b border-gray-100 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-medium text-gray-500">Pricing</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Start free. Upgrade when it saves you time.
        </h2>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border bg-white p-6 ${
                plan.featured
                  ? "border-2 border-gray-900 shadow-sm"
                  : "border-gray-200"
              }`}
            >
              {plan.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gray-900 px-3 py-0.5 text-xs font-medium text-white">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
              <p className="mt-2">
                <span className="text-3xl font-semibold text-gray-900">
                  {plan.price}
                </span>
                <span className="text-gray-500">{plan.period}</span>
              </p>
              <ul className="mt-6 flex-1 space-y-3">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-gray-600"
                  >
                    <Check
                      className="mt-0.5 h-4 w-4 shrink-0 text-gray-900"
                      aria-hidden
                    />
                    {feature}
                  </li>
                ))}
              </ul>
              <a
                href="#hero"
                className={`mt-8 block rounded-md px-4 py-2.5 text-center text-sm font-medium ${
                  plan.ctaStyle === "primary"
                    ? "bg-gray-900 text-white hover:bg-gray-800"
                    : "border border-gray-300 text-gray-900 hover:bg-gray-50"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
