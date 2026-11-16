"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, X } from "lucide-react";
import { FREE_GENERATION_LIMIT } from "@/lib/demo-constants";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";
import GenerationHistory from "@/components/GenerationHistory";
import PriceListSection from "@/components/PriceListSection";
import type { HistoryRow } from "@/app/api/history/route";

const CURRENCY_KEY = "advisorai_currency";

const CURRENCIES = [
  { value: "KZT", label: "KZT (₸)" },
  { value: "RUB", label: "RUB (₽)" },
  { value: "USD", label: "USD ($)" },
  { value: "AED", label: "AED (د.إ)" },
  { value: "GBP", label: "GBP (£)" },
];

type UsageCheck = {
  allowed: boolean;
  count: number;
  remaining: number;
  isPro?: boolean;
  /** Monthly allowance of the signed-in user's plan; null when unlimited. */
  limit?: number | null;
};

type GenerateResult = { estimate: string; explanation: string; upsell: string };

// ─── Component ───────────────────────────────────────────────────────────────

export default function DemoWidget() {
  const { lang, t } = useLanguage();
  const { user, session, plan, hasBilling, openAuthModal } = useAuth();
  const isPro = plan === "standard" || plan === "professional";

  const enDefault = "BMW 520d, 180k miles. Front brake discs + pads. Oil seal leaking on crank.";
  const ruDefault = "BMW 520d, 180 тыс. км. Передние тормозные диски + колодки. Течь сальника коленвала.";

  const textareaPlaceholder = user
    ? lang === "ru"
      ? "Опишите автомобиль и работы: марка, модель, пробег, что нужно сделать"
      : "Describe the car and job: make, model, mileage, what needs to be done"
    : lang === "ru"
    ? ruDefault
    : enDefault;

  const defaultCurrency = lang === "ru" ? "KZT" : "USD";
  const [currency, setCurrency] = useState<string>(() => {
    try { return localStorage.getItem(CURRENCY_KEY) ?? defaultCurrency; } catch { return defaultCurrency; }
  });

  const [jobDescription, setJobDescription] = useState<string>(t.defaultJob);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [usage, setUsage] = useState<UsageCheck | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);

  // When user logs in, clear the pre-filled example so the instructional placeholder shows
  useEffect(() => {
    if (user) {
      setJobDescription((prev) =>
        prev === enDefault || prev === ruDefault ? "" : prev
      );
    }
  }, [user]);

  // Sync placeholder when language toggles (only if user hasn't typed anything custom)
  useEffect(() => {
    setJobDescription((prev) => {
      if (prev === enDefault || prev === ruDefault) return t.defaultJob;
      return prev;
    });
    // Switch to language-default currency only if localStorage has no saved preference
    if (!localStorage.getItem(CURRENCY_KEY)) {
      setCurrency(lang === "ru" ? "KZT" : "USD");
    }
  }, [lang]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleCurrencyChange(val: string) {
    setCurrency(val);
    try { localStorage.setItem(CURRENCY_KEY, val); } catch { /* ignore */ }
  }

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
    const data = await res.json() as { count: number; remaining: number; allowed: boolean; isPro: boolean; limit: number | null };
    const check: UsageCheck = {
      allowed: data.allowed,
      count: data.count,
      remaining: data.remaining,
      isPro: data.isPro,
      limit: data.limit,
    };
    setUsage(check);
    return check;
  }, [supabaseHeaders]);

  // ─── Unified refresh (picks mode based on auth state) ──────────────────
  // A visitor who is not signed in gets FREE_GENERATION_LIMIT generations a
  // day, counted per IP by /api/generate. The landing page promises a demo
  // you can try right now, so the widget reads that allowance and spends it;
  // the account is asked for once it runs out.

  /** The daily free allowance of a visitor who is not signed in. */
  const fetchAnonUsage = useCallback(async (): Promise<UsageCheck> => {
    const res = await fetch("/api/usage/check", { method: "POST" });
    if (!res.ok) throw new Error("Failed to fetch usage");
    const data = (await res.json()) as UsageCheck;
    const check: UsageCheck = {
      allowed: data.allowed,
      count: data.count,
      remaining: data.remaining,
    };
    setUsage(check);
    return check;
  }, []);

  const refreshUsage = useCallback(async (): Promise<UsageCheck> => {
    if (user && session) {
      return fetchSupabaseUsage();
    }
    return fetchAnonUsage();
  }, [user, session, fetchSupabaseUsage, fetchAnonUsage]);

  // Signed in: show the real monthly count straight away. Signed out: the
  // daily allowance is read on the first click instead, so a visit that never
  // touches the demo costs no request.
  useEffect(() => {
    if (user && session) void refreshUsage();
  }, [user, session, refreshUsage]);

  const fetchHistory = useCallback(async () => {
    if (!user || !session) return;
    try {
      const res = await fetch("/api/history", { headers: supabaseHeaders() });
      if (!res.ok) return;
      const data = await res.json() as { history: HistoryRow[] };
      setHistory(data.history);
    } catch { /* ignore */ }
  }, [user, session, supabaseHeaders]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  // ─── Generation ────────────────────────────────────────────────────────

  async function runGenerate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const generateHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (session?.access_token) generateHeaders["Authorization"] = `Bearer ${session.access_token}`;
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: generateHeaders,
        body: JSON.stringify({ jobDescription, language: lang, currency: CURRENCIES.find(c => c.value === currency)?.label ?? currency }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        if (data.code === "USAGE_LIMIT") {
          setShowUpgradeModal(true);
          return;
        }
        if (data.code === "GENERATE_FAILED") {
          throw new Error(t.generateErrorGeneric);
        }
        throw new Error(data.error ?? t.generateErrorGeneric);
      }
      const generationResult: GenerateResult = { estimate: data.estimate, explanation: data.explanation, upsell: data.upsell };
      setResult(generationResult);

      if (!user) {
        // Keep the "N left today" line honest after a generation.
        await fetchAnonUsage().catch(() => { /* the server still counts it */ });
      }

      if (user && session) {
        const selectedCurrencyLabel = CURRENCIES.find(c => c.value === currency)?.label ?? currency;
        await Promise.all([
          isPro ? Promise.resolve() : fetchSupabaseUsage(),
          fetch("/api/history", {
            method: "POST",
            headers: supabaseHeaders(),
            body: JSON.stringify({
              input: jobDescription,
              estimate: generationResult.estimate,
              explanation: generationResult.explanation,
              upsell: generationResult.upsell,
              currency: selectedCurrencyLabel,
            }),
          }).then(() => fetchHistory()),
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate");
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setError(null);
    if (isPro) { await runGenerate(); return; }

    let status: UsageCheck;
    try {
      status = await refreshUsage();
    } catch {
      // Fail open on the pre-flight check — /api/generate enforces the real limit server-side.
      status = { allowed: true, count: 0, remaining: FREE_GENERATION_LIMIT };
    }

    if (!status.allowed) {
      setShowUpgradeModal(true);
      return;
    }
    await runGenerate();
  }

  // Sends the subscriber to Paddle's own portal, where the subscription can be
  // cancelled and the card changed. The link is single-use, so it is fetched
  // on the click and followed straight away rather than rendered into the page.
  async function openBillingPortal() {
    if (portalLoading) return;
    setPortalError(null);
    setPortalLoading(true);
    try {
      const res = await fetch("/api/paddle/portal", {
        method: "POST",
        headers: supabaseHeaders(),
      });
      const data = (await res.json()) as { url?: string };
      if (!res.ok || !data.url) throw new Error("portal unavailable");
      window.location.href = data.url;
    } catch {
      setPortalError(t.manageBillingError);
      setPortalLoading(false);
    }
  }

  const usageCount = usage?.count ?? 0;
  const remaining = usage?.remaining ?? FREE_GENERATION_LIMIT;
  const isLoggedIn = Boolean(user && session);

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
        {user ? (
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-700">{t.liveDemoLabelLoggedIn}</p>
            <p className="mt-0.5 text-xs text-gray-500">{t.liveDemoSubtitleLoggedIn}</p>
          </div>
        ) : (
          <p className="mb-3 text-sm font-medium text-gray-700">{t.liveDemoLabel}</p>
        )}
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={4}
          placeholder={textareaPlaceholder}
          className="w-full resize-y rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select
            value={currency}
            onChange={(e) => handleCurrencyChange(e.target.value)}
            className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            {CURRENCIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={loading}
            className="touch-manipulation inline-flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {t.generate}
          </button>
        </div>

        {!user ? (
          <p className="mt-2 text-sm text-gray-500">
            {/* Counting down to "0 left" is worse than saying it is gone. */}
            {remaining > 0
              ? t.demoFreeRemaining(remaining)
              : t.demoFreeUsedUpTitle}
          </p>
        ) : isPro ? null : (
          <>
            <p className="mt-2 text-sm text-gray-500">
              {t.usageLabel(usageCount, usage?.limit ?? FREE_GENERATION_LIMIT)}
            </p>
            {remaining > 0 && isLoggedIn && (
              <p className="mt-1 text-sm text-gray-600">{t.remaining(remaining)}</p>
            )}
          </>
        )}

        {isLoggedIn && hasBilling && (
          <p className="mt-2">
            <button
              type="button"
              onClick={() => void openBillingPortal()}
              disabled={portalLoading}
              className="text-sm text-gray-600 underline underline-offset-2 hover:text-gray-900 disabled:opacity-60"
            >
              {portalLoading ? t.manageBillingOpening : t.manageBilling}
            </button>
          </p>
        )}

        {portalError && (
          <p role="alert" className="mt-1 text-sm text-red-600">
            {portalError}
          </p>
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

{user && session && <GenerationHistory items={history} />}
      {user && session && <PriceListSection session={session} currency={currency} />}

      {showUpgradeModal && (
        <Modal onClose={() => setShowUpgradeModal(false)}>
          <h3 className="text-xl font-semibold text-gray-900">
            {user ? t.limitTitle : t.demoFreeUsedUpTitle}
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            {user ? t.limitSubtext : t.demoFreeUsedUpSubtext}
          </p>
          {!user && (
            <button
              type="button"
              onClick={() => {
                setShowUpgradeModal(false);
                openAuthModal();
              }}
              className="mt-6 block w-full rounded-md bg-gray-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-gray-800"
            >
              {t.demoSignUpFree}
            </button>
          )}
          <Link
            href="#pricing"
            onClick={() => setShowUpgradeModal(false)}
            className={
              user
                ? "mt-6 block w-full rounded-md bg-gray-900 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-gray-800"
                : "mt-3 block w-full rounded-md border border-gray-300 px-4 py-2.5 text-center text-sm font-medium text-gray-900 hover:bg-gray-50"
            }
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
