"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Upload } from "lucide-react";
import { useLanguage } from "@/lib/language-context";
import type { Session } from "@supabase/supabase-js";
import type { PricelistItem, PricelistRow } from "@/app/api/pricelist/route";

const CURRENCY_SYMBOLS: Record<string, string> = {
  KZT: "₸", RUB: "₽", USD: "$", AED: "د.إ", GBP: "£",
};

function readSelectedCurrency(): string {
  try { return localStorage.getItem("advisorai_currency") ?? "USD"; } catch { return "USD"; }
}

type Props = { session: Session };

async function parseFile(file: File): Promise<PricelistItem[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".csv")) {
    const Papa = (await import("papaparse")).default;
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, string>>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const items = normalizeRows(results.data);
          if (items === null) reject(new Error("parse_error"));
          else resolve(items);
        },
        error: () => reject(new Error("parse_error")),
      });
    });
  }

  // Excel
  const { read, utils } = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const wb = read(buffer);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  const items = normalizeRows(rows as Record<string, string>[]);
  if (items === null) throw new Error("parse_error");
  return items;
}

function normalizeRows(rows: Record<string, string>[]): PricelistItem[] | null {
  if (!rows.length) return [];
  // Find columns case-insensitively
  const sample = rows[0];
  const keys = Object.keys(sample);
  const find = (target: string) =>
    keys.find((k) => k.trim().toLowerCase() === target.toLowerCase()) ?? null;

  const svcKey = find("Service");
  const priceKey = find("Price");
  const hoursKey = find("Hours");
  if (!svcKey || !priceKey || !hoursKey) return null;

  return rows
    .filter((r) => r[svcKey]?.trim())
    .map((r) => ({
      service: String(r[svcKey]).trim(),
      price: parseFloat(String(r[priceKey]).replace(/[^\d.-]/g, "")) || 0,
      hours: parseFloat(String(r[hoursKey]).replace(/[^\d.-]/g, "")) || 0,
    }));
}

export default function PriceListSection({ session }: Props) {
  const { t } = useLanguage();
  const fileRef = useRef<HTMLInputElement>(null);

  const [items, setItems] = useState<PricelistItem[]>([]);
  const [filename, setFilename] = useState("");
  const [laborRate, setLaborRate] = useState<number>(0);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [parseError, setParseError] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<string>(readSelectedCurrency);

  const syncCurrency = useCallback(() => setSelectedCurrency(readSelectedCurrency()), []);
  useEffect(() => {
    window.addEventListener("storage", syncCurrency);
    return () => window.removeEventListener("storage", syncCurrency);
  }, [syncCurrency]);

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };

  // Load existing pricelist on mount
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/pricelist", { headers: authHeaders });
        if (!res.ok) return;
        const data = await res.json() as { pricelist: PricelistRow | null };
        if (data.pricelist) {
          setItems(data.pricelist.items);
          setFilename(data.pricelist.filename);
          setLaborRate(data.pricelist.labor_rate);
        }
      } catch { /* ignore */ }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(false);
    try {
      const parsed = await parseFile(file);
      setItems(parsed);
      setFilename(file.name);
    } catch {
      setParseError(true);
    }
    e.target.value = "";
  }

  async function handleSave() {
    setSaveStatus("saving");
    try {
      await fetch("/api/pricelist", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ filename, labor_rate: laborRate, items }),
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch {
      setSaveStatus("idle");
    }
  }

  return (
    <div className="mt-8">
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{t.pricelistTitle}</h2>

      {/* Upload + labor rate row */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Upload className="h-4 w-4" />
          {t.pricelistUpload}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFile}
        />

        <label className="flex items-center gap-2 text-sm text-gray-700">
          <span className="whitespace-nowrap">{t.pricelistLaborRate}:</span>
          <input
            type="number"
            min={0}
            value={laborRate}
            onChange={(e) => setLaborRate(Number(e.target.value))}
            className="w-24 rounded-md border border-gray-200 px-2 py-1.5 text-sm text-gray-900 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
          <span className="text-gray-500">{CURRENCY_SYMBOLS[selectedCurrency] ?? selectedCurrency}</span>
        </label>

        {items.length > 0 && (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saveStatus === "saving"}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
          >
            {saveStatus === "saving"
              ? t.pricelistSaving
              : saveStatus === "saved"
              ? t.pricelistSaved
              : t.pricelistSave}
          </button>
        )}
      </div>

      {parseError && (
        <p className="mt-2 text-sm text-red-600">{t.pricelistParseError}</p>
      )}
      {filename && !parseError && (
        <p className="mt-1 text-xs text-gray-400">{filename}</p>
      )}

      {/* Table */}
      {items.length === 0 && !parseError ? (
        <p className="mt-4 text-sm text-gray-500">{t.pricelistEmpty}</p>
      ) : items.length > 0 ? (
        <div className="mt-4 overflow-x-auto rounded-lg border border-gray-200">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-2">{t.pricelistColService}</th>
                <th className="px-4 py-2">{t.pricelistColPrice}</th>
                <th className="px-4 py-2">{t.pricelistColHours}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {items.map((item, i) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-gray-800">{item.service}</td>
                  <td className="px-4 py-2 text-gray-600">{item.price}</td>
                  <td className="px-4 py-2 text-gray-600">{item.hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
