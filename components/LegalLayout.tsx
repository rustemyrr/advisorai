import Link from "next/link";
import { Car } from "lucide-react";
import Footer from "./Footer";

export default function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-gray-900"
          >
            <Car className="h-5 w-5" aria-hidden />
            AdvisorAI
          </Link>
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
            Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900">
          {title}
        </h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: {lastUpdated}</p>
        <div className="prose-legal mt-10 space-y-8 text-gray-700">{children}</div>
      </main>
      <Footer />
    </>
  );
}
