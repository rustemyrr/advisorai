"use client";

import { Car, LogOut } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";
import { useAuth } from "@/lib/auth-context";

export default function Navbar() {
  const { lang, t, toggle } = useLanguage();
  const { user, loading, openAuthModal, signOut } = useAuth();

  const shortEmail = user?.email
    ? user.email.length > 22
      ? user.email.slice(0, 20) + "…"
      : user.email
    : null;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold text-gray-900"
        >
          <Car className="h-5 w-5" aria-hidden />
          AdvisorAI
        </Link>
        <nav className="flex items-center gap-3 sm:gap-4">
          <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">
            {t.pricing}
          </a>
          <button
            type="button"
            onClick={toggle}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            aria-label="Toggle language"
          >
            {lang === "en" ? "RU" : "EN"}
          </button>

          {!loading && user ? (
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-gray-600 sm:block">{shortEmail}</span>
              <button
                type="button"
                onClick={() => void signOut()}
                className="flex items-center gap-1.5 rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                title="Sign out"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:block">
                  {lang === "en" ? "Sign out" : "Выйти"}
                </span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={openAuthModal}
              disabled={loading}
              className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {t.startFree}
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}
