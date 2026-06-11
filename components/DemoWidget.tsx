"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { FREE_GENERATION_LIMIT } from "@/lib/demo-constants";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";

const STORAGE_KEY = "advisorai_usage";

type StoredUsage = { count: number; date: string; email: string | null };

type UsageCheck = {
  allowed: boolean;
  requiresEmail: boolean;
  count: number;
  remaining: number;
  email: string | null;
  isPro?: boolean;
};

type GenerateResult = { estimate: string; explanation: string; upsell: string };

// ─── localStorage helpers (anonymous users) ──────────────────────────────────

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function readLocalUsage(): StoredUsage {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { count: 0, date: getTodayString(), email: null };
    const p = JSON.parse(raw) as StoredUsage;
    return p.date !== getTodayString()
      ? { count: 0, date: getTodayString(), email: p.email }
      : p;
  } catch {
    return { count: 0, date: getTodayString(), email: null };
  }
}

function writeLocalUsage(u: StoredUsage) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(u)); } catch { /* ignore */ }
}

function localToCheck(s: StoredUsage): UsageCheck {
  const limitReached = s.count >= FREE_GENERATION_LIMIT;
  const requiresEmail = s.count >= 1 && s.count < FREE_GENERATION_LIMIT && !s.email;
  return {
    allowed: !limitReached && !requiresEmail,
    requiresEmail,
    count: s.count,
    remaining: Math.max(0, FREE_GENERATION_LIMIT - s.count),
    email: s.email,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DemoWidget() {
  const { lang, t } = useLanguage();
  const { user, session } = useAuth();

  const enDefault = "BMW 520d, 180k miles. Front brake discs + pads. Oil seal leaking on crank.";
  const ruDefault = "BMW 520d, 180 тыс. км. Передние тормозные диски + колодки. Течь сальника коленвала.";

  const [jobDescription, setJobDescription] = useState<string>(t.defaultJob);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [usage, setUsage] = useState<UsageCheck | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [emailSubmitting, setEmailSubmitting] = useState(false);

  // Sync placeholder when language toggles (only if user hasn't typed anything custom)
  useEffect(() => {
    setJobDescription((prev) => {
      if (prev === enDefault || prev === ruDefault) return t.defaultJob;
      return prev;
    });
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Supabase usage helpers ─────────────────────────────────────────────

  const supabaseHeaders = useCallback(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    }),
    [session]
  );

  const fetchSupabaseUsage = useCallback(async (): Promise<UsageCheck> => {
    const res = await fetch("/api/usage/supabase", { headers: supabaseHeaders() });
    if (!res.ok) throw new Error("Failed to fetch usage");
    const data = await res.json() as { count: number; remaining: number; allowed: boolean; isPro: boolean };
    const check: UsageCheck = {
      allowed: data.allowed,
      requiresEmail: false,
      count: data.count,
      remaining: data.remaining,
      email: user?.email ?? null,
      isPro: data.isPro,
    };
    setUsage(check);
    return check;
  }, [user, supabaseHeaders]);

  const incrementSupabaseUsage = useCallback(async (): Promise<UsageCheck> => {
    const res = await fetch("/api/usage/supabase", {
      method: "POST",
      headers: supabaseHeaders(),
      body: JSON.stringify({ action: "increment" }),
    });
    if (!res.ok) throw new Error("Failed to track usage");
    const data = await res.json() as { count: number; remaining: number; allowed: boolean; isPro: boolean };
    const check: UsageCheck = {
      allowed: data.allowed,
      requiresEmail: false,
      count: data.count,
      remaining: data.remaining,
      email: user?.email ?? null,
      isPro: data.isPro,
    };
    setUsage(check);
    return check;
  }, [user, supabaseHeaders]);

  // ─── Unified refresh (picks mode based on auth state) ──────────────────

  const refreshUsage = useCallback(async (): Promise<UsageCheck> => {
    if (user && session) {
      return fetchSupabaseUsage();
    }
    const stored = readLocalUsage();
    const check = localToCheck(stored);
    setUsage(check);
    return check;
  }, [user, session, fetchSupabaseUsage]);

  useEffect(() => {
    void refreshUsage();
  }, [refreshUsage]);

  // ─── Local increment (anonymous) ───────────────────────────────────────

  function incrementLocalUsage(): UsageCheck {
    const stored = readLocalUsage();
    const updated: StoredUsage = { ...stored, count: stored.count + 1 };
    writeLocalUsage(updated);
    const check = localToCheck(updated);
    setUsage(check);
    return check;
  }

  function saveEmailLocally(email: string): UsageCheck {
    const stored = readLocalUsage();
    const updated: StoredUsage = { ...stored, email: email.trim().toLowerCase() };
    writeLocalUsage(updated);
    const check = localToCheck(updated);
    setUsage(check);
    return check;
  }

  // ─── Generation ────────────────────────────────────────────────────────

  async function runGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobDescription, language: lang }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? "Something went wrong");
      setResult({ estimate: data.estimate, explanation: data.explanation, upsell: data.upsell });

      if (user && session) {
        await incrementSupabaseUsage();
      } else {
        incrementLocalUsage();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setError(null);
    const status = await refreshUsage();

    if (!status.allowed) {
      if (status.requiresEmail) { setShowEmailModal(true); return; }
      setShowUpgradeModal(true);
      return;
    }
    await runGenerate();
  }

  async function handleEmailContinue(e: React.FormEvent) {
    e.preventDefault();
    const email = emailInput.trim();
    if (!email) { setError(t.pleaseEnterEmail); return; }
    setEmailSubmitting(true);
    setError(null);
    try {
      saveEmailLocally(email);
      setShowEmailModal(false);
      await runGenerate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setEmailSubmitting(false);
    }
  }

  const usageCount = usage?.count ?? 0;
  const remaining = usage?.remaining ?? FREE_GENERATION_LIMIT;
  const hasEmail = Boolean(usage?.email);

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
        <p className="mb-3 text-sm font-medium text-gray-700">{t.liveDemoLabel}</p>
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
          {t.generate}
        </button>

        <p className="mt-2 text-sm text-gray-500">
          {usage?.isPro
            ? lang === "en" ? "Unlimited generations (Pro)" : "Безлимитные генерации (Pro)"
            : t.usageLabel(usageCount, FREE_GENERATION_LIMIT)}
        </p>
        {!usage?.isPro && hasEmail && remaining > 0 && (
          <p className="mt-1 text-sm text-gray-600">{t.remaining(remaining)}</p>
        )}

        {error && (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {result && (
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <OutputBlock title={t.outputEstimate} content={result.estimate} />
            <OutputBlock title={t.outputExplanation} content={result.explanation} />
            <OutputBlock title={t.outputUpsell} content={result.upsell} />
          </div>
        )}
      </div>

      {showEmailModal && (
        <Modal onClose={() => setShowEmailModal(false)}>
          <h3 className="text-xl font-semibold text-gray-900">{t.emailModalTitle}</h3>
          <p className="mt-2 text-sm text-gray-600">{t.emailModalSubtext}</p>
          <form onSubmit={(e) => void handleEmailContinue(e)} className="mt-6">
            <input
              type="email"
              required
              placeholder={t.emailPlaceholder}
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <button
              type="submit"
              disabled={emailSubmitting || loading}
              className="mt-4 w-full rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {emailSubmitting || loading ? t.pleaseWait : t.continueGenerating}
            </button>
            <p className="mt-3 text-center text-xs text-gray-500">{t.upgradeNote}</p>
          </form>
        </Modal>
      )}

      {showUpgradeModal && (
        <Modal onClose={() => setShowUpgradeModal(false)}>
          <h3 className="text-xl font-semibold text-gray-900">{t.limitTitle}</h3>
          <p className="mt-2 text-sm text-gray-600">{t.limitSubtext}</p>
          <Link
            href="#pricing"
            onClick={() => setShowUpgradeModal(false)}
            className="mt-6 block w-full rounded-md bg-gray-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-gray-800"
          >
            {t.startTrial}
          </Link>
        </Modal>
      )}
    </>
  );
}

function Modal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600" aria-label="Close">
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
      <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{content}</p>
    </div>
  );
}
