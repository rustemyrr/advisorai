"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

const DEFAULT_JOB =
  "BMW 520d, 180k miles. Front brake discs + pads. Oil seal leaking on crank.";

type GenerateResult = {
  estimate: string;
  explanation: string;
  upsell: string;
};

export default function DemoWidget() {
  const [jobDescription, setJobDescription] = useState(DEFAULT_JOB);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Something went wrong");
      }
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
      <p className="mb-3 text-sm font-medium text-gray-700">
        Live demo — try it now
      </p>
      <textarea
        value={jobDescription}
        onChange={(e) => setJobDescription(e.target.value)}
        rows={4}
        className="w-full resize-y rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
      />
      <button
        type="button"
        onClick={handleGenerate}
        disabled={loading}
        className="mt-3 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        Generate
      </button>

      {error && (
        <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <OutputBlock title="Estimate" content={result.estimate} />
          <OutputBlock
            title="Plain-language explanation"
            content={result.explanation}
          />
          <OutputBlock title="Upsell suggestion" content={result.upsell} />
        </div>
      )}
    </div>
  );
}

function OutputBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
        {content}
      </p>
    </div>
  );
}
