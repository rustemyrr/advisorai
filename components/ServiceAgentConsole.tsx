"use client";

import { useCallback, useRef, useState } from "react";
import { Phone, RefreshCw, Send } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/**
 * The console the shop owner tests the agent from, before a single real call
 * is made: type what a customer would say, watch which tools the agent used,
 * and see what landed in the database.
 *
 * It talks to the same /api/service-agent/chat the phone line talks to through
 * /api/service-agent/voice, so what works here works on the line. Signed in
 * only -- the endpoint spends the Anthropic key and writes bookings.
 */

type Turn = { role: "customer" | "agent"; text: string; tools?: string[] };

type ChatResponse = {
  reply: string;
  toolsUsed?: string[];
  outcome?: Record<string, unknown>;
  customerKnown?: boolean;
  shop?: { name: string; timezone: string };
  error?: string;
};

type ReminderResponse = {
  today?: string;
  persistent?: boolean;
  telephony?: string;
  maintenance?: { due: number; called: number; skipped: number; failed: number };
  warranty?: { due: number; called: number; skipped: number; failed: number };
  confirmation?: { due: number; called: number; skipped: number; failed: number };
  notes?: string[];
  error?: string;
};

const SUGGESTIONS = [
  "Здравствуйте, хочу записаться на ТО на эту субботу",
  "Что входит в плановое обслуживание и сколько это по времени?",
  "У меня стучит спереди справа, это по гарантии?",
  "Можно перенести мою запись на другой день?",
];

export default function ServiceAgentConsole() {
  const { user, session, openAuthModal } = useAuth();
  const [phone, setPhone] = useState("+7 701 123 45 67");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminders, setReminders] = useState<ReminderResponse | null>(null);
  const historyRef = useRef<Turn[]>([]);

  const send = useCallback(
    async (text: string) => {
      if (!text.trim() || busy) return;
      if (!user || !session) {
        openAuthModal();
        return;
      }

      setBusy(true);
      setError(null);
      const history = historyRef.current;
      setTurns((prev) => [...prev, { role: "customer", text }]);
      setInput("");

      try {
        const res = await fetch("/api/service-agent/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ message: text, history, phone }),
        });
        const data = (await res.json()) as ChatResponse;
        if (!res.ok) throw new Error(data.error ?? "Агент не ответил");

        const agentTurn: Turn = {
          role: "agent",
          text: data.reply,
          tools: data.toolsUsed,
        };
        historyRef.current = [...history, { role: "customer", text }, agentTurn];
        setTurns((prev) => [...prev, agentTurn]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Агент не ответил");
      } finally {
        setBusy(false);
      }
    },
    [busy, openAuthModal, phone, session, user]
  );

  const runReminders = useCallback(async () => {
    if (!user || !session) {
      openAuthModal();
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/service-agent/reminders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({}),
      });
      const data = (await res.json()) as ReminderResponse;
      if (!res.ok) throw new Error(data.error ?? "Напоминания не отработали");
      setReminders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Напоминания не отработали");
    } finally {
      setBusy(false);
    }
  }, [openAuthModal, session, user]);

  const reset = () => {
    historyRef.current = [];
    setTurns([]);
    setError(null);
  };

  return (
    <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
        Агент-администратор автосервиса
      </h1>
      <p className="mt-3 max-w-2xl text-gray-700">
        Здесь можно проверить агента текстом — ровно того же, который отвечает на
        звонки: он консультирует, подбирает свободное время, записывает,
        подтверждает запись и напоминает о ТО и окончании гарантии.
      </p>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Номер звонящего
          </label>
          <input
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className="w-48 rounded-md border border-gray-200 px-3 py-1.5 text-sm"
            placeholder="+7 701 123 45 67"
          />
          <button
            type="button"
            onClick={reset}
            className="ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Новый разговор
          </button>
        </div>

        <div className="max-h-[22rem] space-y-3 overflow-y-auto p-4">
          {turns.length === 0 && (
            <p className="text-sm text-gray-500">
              Начните как клиент — например: «хочу записаться на ТО».
            </p>
          )}
          {turns.map((turn, index) => (
            <div
              key={`${index}-${turn.role}`}
              className={turn.role === "customer" ? "text-right" : "text-left"}
            >
              <div
                className={`inline-block max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  turn.role === "customer"
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-900"
                }`}
              >
                {turn.text}
              </div>
              {turn.tools && turn.tools.length > 0 && (
                <p className="mt-1 text-xs text-gray-400">
                  инструменты: {turn.tools.join(", ")}
                </p>
              )}
            </div>
          ))}
          {busy && <p className="text-sm text-gray-400">агент печатает…</p>}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
          className="flex gap-2 border-t border-gray-100 p-4"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Что говорит клиент"
            className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy || !input.trim()}
            className="flex items-center gap-1.5 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            <Send className="h-4 w-4" strokeWidth={1.5} aria-hidden />
            Отправить
          </button>
        </form>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => void send(suggestion)}
            disabled={busy}
            className="rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-10 rounded-xl border border-gray-200 bg-gray-50 p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          Напоминания о ТО, гарантии и подтверждении
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Обычно это делает расписание каждое утро. Кнопка запускает тот же
          проход вручную: агент находит, у кого подошло ТО, у кого заканчивается
          гарантия и кто записан на завтра, и звонит — либо, пока телефония не
          подключена, присылает список администратору в телеграм.
        </p>
        <button
          type="button"
          onClick={() => void runReminders()}
          disabled={busy}
          className="mt-4 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          Запустить проход
        </button>

        {reminders && (
          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            {(["maintenance", "warranty", "confirmation"] as const).map((kind) => {
              const counts = reminders[kind];
              const label =
                kind === "maintenance"
                  ? "ТО"
                  : kind === "warranty"
                    ? "Гарантия"
                    : "Подтверждения";
              return (
                <div key={kind} className="rounded-lg border border-gray-200 bg-white p-3">
                  <dt className="font-medium text-gray-900">{label}</dt>
                  <dd className="mt-1 text-gray-600">
                    найдено {counts?.due ?? 0}, позвонили {counts?.called ?? 0},
                    пропущено {counts?.skipped ?? 0}, не удалось{" "}
                    {counts?.failed ?? 0}
                  </dd>
                </div>
              );
            })}
            <div className="sm:col-span-3">
              <p className="text-xs text-gray-500">
                Канал: {reminders.telephony ?? "неизвестен"}
                {reminders.today ? ` · дата расчёта: ${reminders.today}` : ""}
              </p>
              {(reminders.notes ?? []).map((note) => (
                <p key={note} className="mt-1 text-xs text-amber-700">
                  {note}
                </p>
              ))}
            </div>
          </dl>
        )}
      </div>
    </section>
  );
}
