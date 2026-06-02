"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { FREE_GENERATION_LIMIT } from "@/lib/demo-constants";

const DEFAULT_JOB =
  "BMW 520d, 180k miles. Front brake discs + pads. Oil seal leaking on crank.";

type GenerateResult = {
  estimate: string;
  explanation: string;
  upsell: string;
};

type UsageCheck = {
  allowed: boolean;
  requiresEmail: boolean;
  count: number;
  remaining: number;
  email: string | null;
};

export default function DemoWidget() {
  const [jobDescription, setJobDescription] = useState(DEFAULT_JOB);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [usage, setUsage] = useState<UsageCheck | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  const fetchUsageCheck = useCallback(async () => {
    const res = await fetch("/api/usage/check", { method: "POST" });
    if (!res.ok) return null;
    return (await res.json()) as UsageCheck;
  }, []);

  useEffect(() => {
    void fetchUsageCheck().then((status) => {
      if (status) setUsage(status);
    });
  }, [fetchUsageCheck]);

  async function saveEmail(): Promise<boolean> {
    const email = emailInput.trim();
    if (!email) {
      setError("Please enter your email");
      return false;
    }

    setEmailSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/usage/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to save email");
      }

      setUsage(data);
      setShowEmailModal(false);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save email");
      return false;
    } finally {
      setEmailSubmitting(false);
    }
  }

  async function runGenerate() {
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

      if (res.status === 403 && data.code === "LIMIT_REACHED") {
        setUsage(data);
        setShowUpgradeModal(true);
        return;
      }

      if (res.status === 403 && data.code === "EMAIL_REQUIRED") {
        setUsage(data);
        setShowEmailModal(true);
        return;
      }

      if (!res.ok || data.error) {
        throw new Error(data.error ?? "Something went wrong");
      }

      setResult({
        estimate: data.estimate,
        explanation: data.explanation,
        upsell: data.upsell,
      });

      if (data.usage) {
        setUsage(data.usage);
      } else {
        const refreshed = await fetchUsageCheck();
        if (refreshed) setUsage(refreshed);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setError(null);
    const status = (await fetchUsageCheck()) ?? usage;

    if (status) setUsage(status);

    if (!status?.allowed) {
      if (status?.requiresEmail) {
        setShowEmailModal(true);
        return;
      }
      setShowUpgradeModal(true);
      return;
    }

    await runGenerate();
  }

  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    const saved = await saveEmail();
    if (saved) {
      await runGenerate();
    }
  }

  const usageCount = usage?.count ?? 0;
  const remaining = usage?.remaining ?? FREE_GENERATION_LIMIT;
  const hasEmail = Boolean(usage?.email);

  return (
    <>
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
          onClick={() => void handleGenerate()}
          disabled={loading}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          Generate
        </button>

        <p className="mt-2 text-sm text-gray-500">
          {usageCount} of {FREE_GENERATION_LIMIT} free generations used today
        </p>
        {hasEmail && remaining > 0 && (
          <p className="mt-1 text-sm text-gray-600">
            {remaining} generation{remaining === 1 ? "" : "s"} remaining today
          </p>
        )}

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

      {showEmailModal && (
        <Modal onClose={() => setShowEmailModal(false)}>
          <h3 className="text-xl font-semibold text-gray-900">
            🔓 Get 2 more free generations
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            No spam. Just your email to continue.
          </p>
          <form onSubmit={(e) => void handleEmailContinue(e)} className="mt-6">
            <input
              type="email"
              required
              placeholder="you@dealership.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <button
              type="submit"
              disabled={emailSubmitting || loading}
              className="mt-4 w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {emailSubmitting || loading
                ? "Please wait…"
                : "Continue generating →"}
            </button>
            <p className="mt-3 text-center text-xs text-gray-500">
              Upgrade anytime for unlimited access
            </p>
          </form>
        </Modal>
      )}

      {showUpgradeModal && (
        <Modal onClose={() => setShowUpgradeModal(false)}>
          <h3 className="text-xl font-semibold text-gray-900">
            You&apos;ve reached the free limit
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Upgrade to Pro for unlimited estimates, explanations, and upsell
            suggestions.
          </p>
          <Link
            href="#pricing"
            onClick={() => setShowUpgradeModal(false)}
            className="mt-6 block w-full rounded-md bg-gray-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-gray-800"
          >
            Start 7-day free trial →
          </Link>
        </Modal>
      )}
    </>
  );
}

function Modal({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="pr-6">{children}</div>
      </div>
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
