const testimonials = [
  {
    quote:
      "I used to spend my lunch break catching up on estimates. Now I'm done before the customer leaves the service desk.",
    name: "James M.",
    role: "Service Advisor, BMW Dubai",
  },
  {
    quote:
      "The upsell suggestions alone paid for 6 months of the subscription in the first week.",
    name: "Sarah R.",
    role: "Senior Advisor, Toyota London",
  },
];

export default function Testimonials() {
  return (
    <section className="border-b border-gray-100 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <p className="text-sm font-medium text-gray-500">What advisors say</p>
        <h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          Trusted by service advisors at BMW, Lexus, and Toyota dealerships.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {testimonials.map((t) => (
            <blockquote
              key={t.name}
              className="rounded-xl border border-gray-200 bg-white p-6 sm:p-8"
            >
              <p className="text-gray-700">&ldquo;{t.quote}&rdquo;</p>
              <footer className="mt-6">
                <p className="font-semibold text-gray-900">{t.name}</p>
                <p className="text-sm text-gray-500">{t.role}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
