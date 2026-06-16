"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { HistoryRow } from "@/app/api/history/route";

function formatDate(iso: string, lang: string): string {
  return new Date(iso).toLocaleString(lang === "ru" ? "ru-RU" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + "…";
}

function HistoryItem({ item }: { item: HistoryRow }) {
  const { lang, t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-400">{formatDate(item.created_at, lang)} · {item.currency}</p>
          <p className="mt-1 text-sm font-medium text-gray-800">{truncate(item.input, 60)}</p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 hover:text-gray-700"
        >
          {expanded ? t.historyCollapse : t.historyExpand}
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {expanded && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <DetailBlock title={lang === "ru" ? "Смета" : "Estimate"} content={item.estimate} />
          <DetailBlock title={lang === "ru" ? "Объяснение" : "Explanation"} content={item.explanation} />
          <DetailBlock title={lang === "ru" ? "Допродажа" : "Upsell"} content={item.upsell} />
        </div>
      )}
    </div>
  );
}

function DetailBlock({ title, content }: { title: string; content: string }) {
  return (
    <div className="rounded-md border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs font-semibold text-gray-600">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600">{content}</p>
    </div>
  );
}

export default function GenerationHistory({ items }: { items: HistoryRow[] }) {
  const { t } = useLanguage();

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{t.historyTitle}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{t.historyEmpty}</p>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <HistoryItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
