"use client";

import { Car } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/lib/language-context";

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-gray-200 py-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <Car className="h-5 w-5" aria-hidden />
          AdvisorAI
        </div>
        <nav className="flex items-center gap-4 text-sm text-gray-500">
          <Link href="/terms" className="hover:text-gray-900">
            {t.footerTerms}
          </Link>
          <Link href="/privacy" className="hover:text-gray-900">
            {t.footerPrivacy}
          </Link>
          <Link href="/refund" className="hover:text-gray-900">
            {t.footerRefund}
          </Link>
        </nav>
        <p className="text-sm text-gray-500">{t.footerTagline}</p>
      </div>
    </footer>
  );
}
