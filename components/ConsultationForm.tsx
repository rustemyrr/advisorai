"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useLanguage } from "@/lib/language-context";

type Status = "idle" | "sending" | "done" | "error";

const inputClass =
  "w-full rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400";

export default function ConsultationForm() {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [comment, setComment] = useState("");
  // Honeypot: hidden from people, left empty by them, filled by form-stuffing
  // bots. The API drops anything that arrives with it set.
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === "sending") return;

    if (!name.trim() || !contact.trim()) {
      setStatus("error");
      setError(t.consultErrorRequired);
      return;
    }

    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          comment: comment.trim(),
          website,
        }),
      });
      if (res.status === 429) {
        setStatus("error");
        setError(t.consultErrorTooMany);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("done");
    } catch {
      setStatus("error");
      setError(t.consultErrorGeneric);
    }
  }

  return (
    <section id="consultation" className="py-16 sm:py-20">
      <div className="mx-auto max-w-2xl px-4 sm:px-6">
        <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          {t.consultTitle}
        </h2>
        <p className="mt-4 text-gray-600">{t.consultSubtext}</p>

        {status === "done" ? (
          <div
            role="status"
            className="mt-8 flex gap-3 rounded-xl border border-gray-200 bg-gray-50 p-6"
          >
            <Check
              className="mt-0.5 h-5 w-5 shrink-0 text-gray-900"
              strokeWidth={2}
              aria-hidden
            />
            <div>
              <p className="font-semibold text-gray-900">
                {t.consultSuccessTitle}
              </p>
              <p className="mt-1 text-sm text-gray-600">{t.consultSuccessText}</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
            <div>
              <label
                htmlFor="consult-name"
                className="block text-sm font-medium text-gray-700"
              >
                {t.consultName}
              </label>
              <input
                id="consult-name"
                name="name"
                type="text"
                required
                maxLength={100}
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.consultNamePlaceholder}
                className={`mt-2 ${inputClass}`}
              />
            </div>

            <div>
              <label
                htmlFor="consult-contact"
                className="block text-sm font-medium text-gray-700"
              >
                {t.consultContact}
              </label>
              <input
                id="consult-contact"
                name="contact"
                type="text"
                required
                maxLength={200}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={t.consultContactPlaceholder}
                className={`mt-2 ${inputClass}`}
              />
            </div>

            <div>
              <label
                htmlFor="consult-comment"
                className="block text-sm font-medium text-gray-700"
              >
                {t.consultComment}{" "}
                <span className="font-normal text-gray-400">
                  ({t.consultCommentOptional})
                </span>
              </label>
              <textarea
                id="consult-comment"
                name="comment"
                rows={4}
                maxLength={2000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={t.consultCommentPlaceholder}
                className={`mt-2 resize-y ${inputClass}`}
              />
            </div>

            {/* Off-screen rather than display:none, which some bots skip. */}
            <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden" aria-hidden>
              <label htmlFor="consult-website">Website</label>
              <input
                id="consult-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "sending"}
              className="rounded-md bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
            >
              {status === "sending" ? t.consultSending : t.consultSubmit}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
