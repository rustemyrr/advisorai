import DemoWidget from "./DemoWidget";

export default function Hero() {
  return (
    <section id="hero" className="border-b border-gray-100">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="mb-4 inline-block rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-sm text-gray-700">
          AI for automotive service advisors
        </p>
        <h1 className="max-w-3xl text-[2.5rem] font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl">
          Write estimates, explain repairs, and upsell — in 10 seconds.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-gray-600">
          AdvisorAI turns any repair job into a clear customer estimate,
          plain-language explanation, and smart upsell suggestion. No more
          staring at a blank page between cars.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <a
            href="#demo"
            className="inline-flex justify-center rounded-md bg-gray-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
          >
            Try free — no signup needed
          </a>
          <a
            href="#demo"
            className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-50"
          >
            See a demo
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Free plan available · No credit card · Works on any device
        </p>
        <div id="demo" className="mt-12">
          <DemoWidget />
        </div>
      </div>
    </section>
  );
}
