"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/lib/language-context";

type Tab = "signin" | "signup";

export default function AuthModal({ onClose }: { onClose: () => void }) {
  const { lang } = useLanguage();
  const [tab, setTab] = useState<Tab>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const copy = {
    en: {
      signup: "Sign up",
      signin: "Sign in",
      emailLabel: "Email",
      passwordLabel: "Password",
      submitSignup: "Create account",
      submitSignin: "Sign in",
      checkEmail: "Check your email to confirm your account.",
      switchToSignin: "Already have an account?",
      switchToSignup: "Don't have an account?",
    },
    ru: {
      signup: "Регистрация",
      signin: "Войти",
      emailLabel: "Email",
      passwordLabel: "Пароль",
      submitSignup: "Создать аккаунт",
      submitSignin: "Войти",
      checkEmail: "Проверьте email — мы отправили письмо для подтверждения.",
      switchToSignin: "Уже есть аккаунт?",
      switchToSignup: "Нет аккаунта?",
    },
  }[lang];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (tab === "signup") {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        // If email confirmation is disabled in Supabase → auth state changes and modal auto-closes.
        // If confirmation is required → show message.
        setSuccess(copy.checkEmail);
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

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

        {/* Tabs */}
        <div className="mb-6 flex border-b border-gray-200">
          {(["signup", "signin"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setTab(t); setError(null); setSuccess(null); }}
              className={`mr-4 pb-3 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-b-2 border-gray-900 text-gray-900"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "signup" ? copy.signup : copy.signin}
            </button>
          ))}
        </div>

        {success ? (
          <p className="rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </p>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {copy.emailLabel}
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                {copy.passwordLabel}
              </label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={tab === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-gray-300 px-4 py-2.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {tab === "signup" ? copy.submitSignup : copy.submitSignin}
            </button>

            <p className="text-center text-xs text-gray-500">
              {tab === "signup" ? copy.switchToSignin : copy.switchToSignup}{" "}
              <button
                type="button"
                onClick={() => { setTab(tab === "signup" ? "signin" : "signup"); setError(null); }}
                className="font-medium text-gray-900 hover:underline"
              >
                {tab === "signup" ? copy.signin : copy.signup}
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
