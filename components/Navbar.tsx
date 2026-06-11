"use client";

import { Car } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

export default function Navbar() {
  const { lang, t, toggle } = useLanguage();

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
          <a
            href="#pricing"
            className="text-sm text-gray-600 hover:text-gray-900"
          >
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
          <a
            href="#hero"
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
          >
            {t.startFree}
          </a>
        </nav>
      </div>
    </header>
  );
}
