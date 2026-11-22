"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowDownRight,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CircleHelp,
  Clock3,
  Database,
  Gauge,
  MessageSquareText,
  Send,
  TriangleAlert,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

type AnswerKey = "profit" | "workload" | "firstStep";

const copy = {
  en: {
    back: "All assistants",
    eyebrow: "Interactive prototype",
    title: "Know what needs your attention today.",
    intro:
      "A daily snapshot, the signals behind it, and a place to ask a question in plain language.",
    demoBadge: "Demo data · fictional workshop",
    date: "Sample business day",
    revenue: "Revenue",
    revenueNote: "3.5% below the usual day",
    average: "Average order",
    averageNote: "36 completed orders",
    grossProfit: "Gross profit",
    grossProfitNote: "12% below the usual day",
    workload: "Workshop load",
    workloadNote: "7 of 9 bays in use",
    attentionTitle: "What needs attention",
    attention1Title: "Gross profit is below usual",
    attention1Text:
      "Down KZT 56,000 against the reference day. Lower sales and higher parts cost both contributed.",
    attention2Title: "Two bays have spare capacity",
    attention2Text:
      "The workshop is at 78% load. Check the schedule before tomorrow's shift starts.",
    attention3Title: "One source is missing",
    attention3Text:
      "This prototype has no live accounting or workshop connection. Figures below are illustrative.",
    askTitle: "Ask about the numbers",
    askText:
      "Try a sample question. This demo answers a few prepared questions and does not send data anywhere.",
    placeholder: "For example: Why is gross profit below usual?",
    send: "Ask",
    examples: "Try asking",
    qProfit: "Why is gross profit below usual?",
    qWorkload: "Where is today's workload low?",
    qFirstStep: "What should I check first?",
    responseLabel: "Assistant response",
    sources:
      "Basis: sample ledger · 36 vs 39 orders · revenue and parts cost totals",
    profitAnswer:
      "Gross profit is KZT 412,000, which is KZT 56,000 (12%) below the reference day. Revenue is KZT 46,000 lower, while parts cost is KZT 10,000 higher. Both explain the difference; start by checking the completed order count and higher parts costs against the source records.",
    workloadAnswer:
      "Seven of nine bays were used, so workshop load was 78%. Two bays were available. Review cancellations and unfilled appointment slots before tomorrow's shift.",
    firstStepAnswer:
      "Start with the two changes that explain the gross-profit gap: three fewer completed orders than usual and KZT 10,000 higher parts costs. Confirm both in the source records before taking action.",
    unknownAnswer:
      "This prototype only recognizes the three sample questions below. It has no connected data or live AI yet. Choose a sample question to see how an answer with its basis could look.",
    disclosure:
      "Prototype only. All figures and explanations are fictional and for interface testing; they are not connected to a business system.",
    kzt: "KZT",
    margin: "32.1% margin",
    noLive: "No live data source",
    sampleSource: "Sample summary · 21 Nov",
    questionHint: "The response appears here",
    questionRequired: "Type a question or choose an example.",
  },
  ru: {
    back: "Все ассистенты",
    eyebrow: "Интерактивный прототип",
    title: "Понимайте, на что обратить внимание сегодня.",
    intro:
      "Сводка за день, сигналы за цифрами и возможность задать вопрос обычным языком.",
    demoBadge: "Учебные данные · вымышленный сервис",
    date: "Пример рабочего дня",
    revenue: "Выручка",
    revenueNote: "На 3,5% ниже обычного дня",
    average: "Средний заказ",
    averageNote: "36 завершённых заказов",
    grossProfit: "Валовая прибыль",
    grossProfitNote: "На 12% ниже обычного дня",
    workload: "Загрузка сервиса",
    workloadNote: "Занято 7 из 9 постов",
    attentionTitle: "На что обратить внимание",
    attention1Title: "Валовая прибыль ниже обычной",
    attention1Text:
      "На 56 000 ₸ ниже контрольного дня. Повлияли и меньшая выручка, и более дорогие запчасти.",
    attention2Title: "Есть свободная мощность",
    attention2Text:
      "Загрузка сервиса — 78%. Проверьте расписание до начала завтрашней смены.",
    attention3Title: "Нет подключения к источникам",
    attention3Text:
      "У прототипа нет связи с учётом или системой автосервиса. Цифры ниже приведены для примера.",
    askTitle: "Задайте вопрос по цифрам",
    askText:
      "Выберите пример или напишите свой вопрос. Демо отвечает на несколько заготовленных вопросов и никуда не отправляет данные.",
    placeholder: "Например: почему валовая прибыль ниже обычной?",
    send: "Спросить",
    examples: "Попробуйте спросить",
    qProfit: "Почему валовая прибыль ниже обычной?",
    qWorkload: "Где сегодня просела загрузка?",
    qFirstStep: "Что проверить в первую очередь?",
    responseLabel: "Ответ ассистента",
    sources:
      "Основа: учебный журнал · 36 из 39 заказов · выручка и затраты на запчасти",
    profitAnswer:
      "Валовая прибыль — 412 000 ₸, это на 56 000 ₸ (12%) ниже контрольного дня. Выручка меньше на 46 000 ₸, а затраты на запчасти выше на 10 000 ₸. Оба фактора объясняют разницу. Сначала сверьте количество завершённых заказов и повышенные затраты на запчасти с первичными данными.",
    workloadAnswer:
      "Были заняты 7 из 9 постов — загрузка составила 78%. Два поста оставались свободными. Перед завтрашней сменой проверьте отмены и незаполненные окна записи.",
    firstStepAnswer:
      "Начните с двух изменений, которые объясняют разницу в валовой прибыли: завершили на три заказа меньше обычного, а затраты на запчасти выросли на 10 000 ₸. Сверьте это с первичными данными, прежде чем принимать решение.",
    unknownAnswer:
      "В этом прототипе распознаются только три примера ниже. Подключённых данных и работающего ИИ пока нет. Выберите пример, чтобы увидеть, как может выглядеть ответ с объяснением его основы.",
    disclosure:
      "Только прототип. Все цифры и объяснения вымышлены и нужны для проверки интерфейса; подключения к системам бизнеса нет.",
    kzt: "₸",
    margin: "Маржа 32,1%",
    noLive: "Нет актуальных данных",
    sampleSource: "Учебная сводка · 21 ноября",
    questionHint: "Ответ появится здесь",
    questionRequired: "Введите вопрос или выберите пример.",
  },
} as const;

const answerByQuestion: Record<AnswerKey, { en: string; ru: string }> = {
  profit: {
    en: copy.en.profitAnswer,
    ru: copy.ru.profitAnswer,
  },
  workload: {
    en: copy.en.workloadAnswer,
    ru: copy.ru.workloadAnswer,
  },
  firstStep: {
    en: copy.en.firstStepAnswer,
    ru: copy.ru.firstStepAnswer,
  },
};

const numberFormat = new Intl.NumberFormat("ru-RU");

export default function DirectorAssistantDemo() {
  const { lang } = useLanguage();
  const t = copy[lang];
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");

  function ask(key?: AnswerKey) {
    setError("");
    if (key) {
      setQuestion(
        key === "profit"
          ? t.qProfit
          : key === "workload"
            ? t.qWorkload
            : t.qFirstStep
      );
      setAnswer(answerByQuestion[key][lang]);
      return;
    }

    const normalized = question.trim().toLocaleLowerCase();
    if (!normalized) {
      setError(t.questionRequired);
      return;
    }

    const keyFromText: AnswerKey | undefined =
      /(прибыл|profit|марж|margin|обычн|usual)/.test(normalized)
        ? "profit"
        : /(загруз|пост|свободн|workload|bay|capacity)/.test(normalized)
          ? "workload"
          : /(провер|сначала|перв|first|check)/.test(normalized)
            ? "firstStep"
            : undefined;
    setAnswer(keyFromText ? answerByQuestion[keyFromText][lang] : t.unknownAnswer);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask();
  }

  const metrics = [
    {
      label: t.revenue,
      value: numberFormat.format(1_284_000),
      unit: t.kzt,
      note: t.revenueNote,
      icon: BarChart3,
      trendDown: true,
    },
    {
      label: t.average,
      value: numberFormat.format(35_667),
      unit: t.kzt,
      note: t.averageNote,
      icon: Gauge,
      trendDown: false,
    },
    {
      label: t.grossProfit,
      value: numberFormat.format(412_000),
      unit: t.kzt,
      note: t.grossProfitNote,
      icon: TriangleAlert,
      trendDown: true,
    },
    {
      label: t.workload,
      value: "78%",
      unit: "",
      note: t.workloadNote,
      icon: Clock3,
      trendDown: false,
    },
  ];

  return (
    <section className="bg-gray-50 py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {t.back}
        </Link>

        <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-700">
              {t.eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-950 sm:text-5xl">
              {t.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
              {t.intro}
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
            <CircleHelp className="h-4 w-4" aria-hidden />
            {t.demoBadge}
          </div>
        </div>

        <div className="mt-9 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 border-b border-gray-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t.date}</h2>
              <p className="mt-1 text-sm text-gray-500">{t.sampleSource}</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600">
              <Database className="h-3.5 w-3.5" aria-hidden />
              {t.noLive}
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(({ label, value, unit, note, icon: Icon, trendDown }) => (
              <article key={label} className="rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-gray-600">{label}</p>
                  <Icon className="h-4 w-4 text-gray-400" aria-hidden />
                </div>
                <p className="mt-4 text-2xl font-semibold tracking-tight text-gray-950">
                  {value} <span className="text-sm font-medium text-gray-500">{unit}</span>
                </p>
                <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-500">
                  {trendDown ? (
                    <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" aria-hidden />
                  ) : (
                    <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
                  )}
                  {note}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <section aria-labelledby="attention-title">
              <div className="flex items-center gap-2">
                <TriangleAlert className="h-5 w-5 text-amber-600" aria-hidden />
                <h2 id="attention-title" className="text-lg font-semibold text-gray-900">
                  {t.attentionTitle}
                </h2>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  [t.attention1Title, t.attention1Text, "border-rose-200 bg-rose-50"],
                  [t.attention2Title, t.attention2Text, "border-amber-200 bg-amber-50"],
                  [t.attention3Title, t.attention3Text, "border-gray-200 bg-white"],
                ].map(([title, body, color]) => (
                  <article key={title} className={`rounded-xl border p-4 ${color}`}>
                    <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{body}</p>
                  </article>
                ))}
              </div>
            </section>

            <section aria-labelledby="ask-title" className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-indigo-700" aria-hidden />
                <h2 id="ask-title" className="text-lg font-semibold text-gray-900">
                  {t.askTitle}
                </h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{t.askText}</p>

              <div className="mt-4 flex flex-wrap gap-2" aria-label={t.examples}>
                <span className="w-full text-xs font-medium uppercase tracking-wide text-gray-400">
                  {t.examples}
                </span>
                {([
                  ["profit", t.qProfit],
                  ["workload", t.qWorkload],
                  ["firstStep", t.qFirstStep],
                ] as const).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => ask(key)}
                    className="rounded-full border border-gray-200 px-3 py-1.5 text-left text-xs text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"
                  >
                    {label}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
                <label className="sr-only" htmlFor="director-question">
                  {t.askTitle}
                </label>
                <input
                  id="director-question"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder={t.placeholder}
                  className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
                >
                  <span className="hidden sm:inline">{t.send}</span>
                  <Send className="h-4 w-4" aria-hidden />
                </button>
              </form>
              {error && <p role="alert" className="mt-2 text-sm text-rose-700">{error}</p>}

              <div aria-live="polite" className="mt-4 min-h-28 rounded-xl bg-gray-50 p-4">
                {answer ? (
                  <>
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
                      {t.responseLabel}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-gray-700">{answer}</p>
                    <p className="mt-3 border-t border-gray-200 pt-3 text-xs leading-relaxed text-gray-500">
                      {t.sources}
                    </p>
                  </>
                ) : (
                  <p className="flex min-h-20 items-center text-sm text-gray-400">
                    {t.questionHint}
                  </p>
                )}
              </div>
            </section>
          </div>

          <p className="mt-6 border-t border-gray-100 pt-4 text-xs leading-relaxed text-gray-500">
            {t.disclosure}
          </p>
        </div>

        <div className="mt-5 flex justify-end">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-950"
          >
            {t.back}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
