"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CircleHelp,
  Lightbulb,
  ListChecks,
  Search,
  Send,
  TriangleAlert,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

/**
 * What the director's assistant actually sends, with invented numbers.
 *
 * The first version of this page was a dashboard somebody imagined: four tiles
 * and three notes. The working framework sends something else entirely, and
 * Rustem reads it every evening -- so the demo has to carry the same shape:
 * the day against its norm, revenue by hour, a P&L that walks from revenue
 * down to profit, the top jobs, the month so far with a forecast, and then the
 * part people actually read -- signals, risks, recommendations, one idea.
 *
 * Everything here is fictional and the page says so three times. It is not the
 * framework and must never be presented as it: no connection, no real figures.
 * The arithmetic below is consistent on purpose -- a sample report whose
 * numbers do not add up teaches the reader to distrust the real one.
 */

const CURRENCY_DAY = 1_284_000;
const CURRENCY_NORM = 1_330_000;
const ORDERS = 36;
const AVERAGE = Math.round(CURRENCY_DAY / ORDERS); // 35 667
const AVERAGE_NORM = 36_900;
const BAYS_USED = 7;
const BAYS_TOTAL = 9;
const LOAD = Math.round((BAYS_USED / BAYS_TOTAL) * 100); // 78

/** Hourly revenue; the parts sum to the day's revenue above. */
const HOURS: ReadonlyArray<readonly [string, number]> = [
  ["09", 42_000],
  ["10", 96_000],
  ["11", 148_000],
  ["12", 171_000],
  ["13", 118_000],
  ["14", 163_000],
  ["15", 186_000],
  ["16", 154_000],
  ["17", 128_000],
  ["18", 78_000],
];
const HOUR_MAX = Math.max(...HOURS.map(([, v]) => v));

const PARTS = 577_800; // 45% of revenue
const WAGES = 231_120; // 18%, piece rate
const ACQUIRING = 15_408; // 1.2%
const TAX = 38_520; // 3% set aside
const GROSS = CURRENCY_DAY - PARTS - WAGES - ACQUIRING - TAX; // 421 152
const FIXED = 268_000;
const NET = GROSS - FIXED; // 153 152

type PnlKind = "base" | "minus" | "subtotal" | "total";
const PNL: ReadonlyArray<{ key: string; value: number; kind: PnlKind }> = [
  { key: "pnlRevenue", value: CURRENCY_DAY, kind: "base" },
  { key: "pnlParts", value: -PARTS, kind: "minus" },
  { key: "pnlWages", value: -WAGES, kind: "minus" },
  { key: "pnlAcquiring", value: -ACQUIRING, kind: "minus" },
  { key: "pnlTax", value: -TAX, kind: "minus" },
  { key: "pnlGross", value: GROSS, kind: "subtotal" },
  { key: "pnlFixed", value: -FIXED, kind: "minus" },
  { key: "pnlNet", value: NET, kind: "total" },
];

/** Top jobs: count and revenue. Not expected to sum to the day. */
const TOP_JOBS: ReadonlyArray<{ key: string; count: number; sum: number }> = [
  { key: "jobOil", count: 9, sum: 171_000 },
  { key: "jobBrakes", count: 5, sum: 164_000 },
  { key: "jobCooling", count: 2, sum: 148_000 },
  { key: "jobSuspension", count: 7, sum: 98_000 },
  { key: "jobTyres", count: 6, sum: 72_000 },
];

const MIX = { labourOnly: 11, labourParts: 21, partsOnly: 4 }; // 36
const SERVICE_PLAN = { done: 5, plan: 8 };

const MONTH = {
  days: 19,
  revenue: 24_980_000,
  orders: 712,
  profit: 3_120_000,
  forecast: 4_250_000,
};

const SIGNALS = ["signal1", "signal2", "signal3", "signal4", "signal5"] as const;
const RISKS = ["risk1", "risk2", "risk3"] as const;
const ACTIONS = ["action1", "action2", "action3"] as const;

type AnswerKey = "profit" | "workload" | "firstStep";

const copy = {
  en: {
    back: "All assistants",
    eyebrow: "Interactive prototype",
    title: "The evening report, the way it actually arrives.",
    intro:
      "The working assistant sends this every evening: the day against its norm, where the money went, and what to do about it. The figures below are invented.",
    demoBadge: "Sample data · fictional workshop",
    shop: "Seifullin Street Workshop",
    day: "Sunday, 22 November 2026",
    kpiRevenue: "Revenue",
    kpiRevenueNote: `3.5% below the ${fmtEn(CURRENCY_NORM)} norm`,
    kpiAverage: "Average order",
    kpiAverageNote: `${ORDERS} orders closed · norm ${fmtEn(AVERAGE_NORM)}`,
    kpiLoad: "Workshop load",
    kpiLoadNote: `${BAYS_USED} of ${BAYS_TOTAL} bays busy`,
    kpiNet: "Net profit",
    kpiNetNote: "11.9% of revenue",
    hoursTitle: "Revenue by hour",
    hoursNote: "Peak at 15:00; the 13:00 dip is the usual lunch gap.",
    pnlTitle: "P&L for the day",
    pnlRevenue: "Revenue",
    pnlParts: "− Parts cost (45%)",
    pnlWages: "− Mechanics' pay (18%, piece rate)",
    pnlAcquiring: "− Card processing (1.2%)",
    pnlTax: "− Tax set aside (3%)",
    pnlGross: "= Gross margin",
    pnlFixed: "− Fixed per day (rent, utilities, admin, security)",
    pnlNet: "= Net profit for the day",
    topTitle: "Top jobs",
    topCount: "Count",
    topSum: "Revenue",
    jobOil: "Oil and filter change",
    jobBrakes: "Brake pad replacement",
    jobCooling: "Cooling system repair",
    jobSuspension: "Suspension diagnostics",
    jobTyres: "Seasonal tyre change",
    mixTitle: "What the orders were made of",
    mixLabourOnly: "Labour only",
    mixLabourParts: "Labour and parts",
    mixPartsOnly: "Parts only",
    planTitle: `Scheduled servicing — plan ${SERVICE_PLAN.plan} cars a day`,
    planNote: `${SERVICE_PLAN.done} of ${SERVICE_PLAN.plan} · third day under plan`,
    monthTitle: "Month to date (1–22 November)",
    monthRevenue: "Revenue",
    monthOrders: "Orders",
    monthProfit: "Profit",
    monthForecast: "Month forecast",
    monthForecastNote: "On the last 30 days' average",
    monthDays: `${MONTH.days} working days`,
    signalsTitle: "Signals of the day",
    signal1: `Revenue is 3.5% under the norm (${fmtEn(CURRENCY_DAY)} against ${fmtEn(CURRENCY_NORM)}), yet profit held: the average order rose 2.1%. Fewer cars, more expensive work.`,
    signal2:
      "Parts are 45% of revenue against the usual 41% — check whether the last purchases went to the pricier supplier.",
    signal3: `Two bays stood idle all day (load ${LOAD}%) — cancellations, or slots nobody filled?`,
    signal4: `Scheduled servicing came in at ${SERVICE_PLAN.done} of ${SERVICE_PLAN.plan}, under plan for the third day running.`,
    signal5:
      "Four orders were parts with no labour — counter sales, or work that was done and never written up?",
    risksTitle: "Risks",
    risk1:
      "If parts settle at 45% of revenue, the month lands roughly KZT 380,000 under the forecast.",
    risk2:
      "Two idle bays are about KZT 90,000 of revenue a day at the average labour rate.",
    risk3:
      "A third day under the servicing plan means next month opens with an empty schedule.",
    actionsTitle: "What to do",
    action1:
      "Check the purchase prices on the last three invoices for pads and filters.",
    action2:
      "Before 10:00 tomorrow, call back the cancellations and offer the free 14:00 and 16:00 slots.",
    action3:
      "Send a service reminder to the 23 cars whose interval came due in the last 30 days.",
    ideaTitle: "Idea of the day",
    idea: "A seasonal package — tyre change, brake check and cabin filter for KZT 28,900 instead of 34,500. It fills the bays that stand idle in the afternoon, which is exactly where the day sags.",
    askTitle: "Ask about the numbers",
    askText:
      "Pick an example or type your own. This demo answers three prepared questions and sends nothing anywhere.",
    placeholder: "For example: why is profit under the norm?",
    send: "Ask",
    examples: "Try asking",
    qProfit: "Why is revenue under the norm?",
    qWorkload: "Where did the load sag today?",
    qFirstStep: "What should I check first?",
    responseLabel: "Assistant response",
    sources: `Basis: sample ledger · ${ORDERS} orders · revenue, parts and payroll`,
    profitAnswer: `Revenue is ${fmtEn(CURRENCY_DAY)} against a norm of ${fmtEn(CURRENCY_NORM)} — 3.5% under. The gap is in volume, not price: the average order is up 2.1%, so fewer cars came through. Net profit still came to ${fmtEn(NET)}, because the day's fixed costs were already covered by 15:00.`,
    workloadAnswer: `Seven of nine bays were busy, so load was ${LOAD}%. The dip is between 13:00 and 14:00 and again after 17:00. Two bays stood free the whole day — check cancellations and unfilled slots before tomorrow's shift.`,
    firstStepAnswer:
      "Parts at 45% of revenue against the usual 41%. That is about KZT 51,000 for the day, more than anything else on this page. Start with the last three purchase invoices.",
    unknownAnswer:
      "This prototype recognizes only the three sample questions below. It has no connected data and no live model. Pick one to see how an answer with its basis would look.",
    disclosure:
      "Prototype only. Every figure here is invented for interface testing; nothing is connected to a business system, and this is not the working assistant.",
    questionHint: "The response appears here",
    questionRequired: "Type a question or choose an example.",
    generated: "Generated by the director's assistant · sample 22.11.2026 20:30",
  },
  ru: {
    back: "Все ассистенты",
    eyebrow: "Интерактивный прототип",
    title: "Вечерний отчёт — так, как он приходит.",
    intro:
      "Работающий ассистент присылает это каждый вечер: день против нормы, куда ушли деньги и что с этим делать. Цифры ниже вымышлены.",
    demoBadge: "Учебные данные · вымышленный сервис",
    shop: "Автосервис на Сейфуллина",
    day: "Воскресенье, 22 ноября 2026",
    kpiRevenue: "Выручка",
    kpiRevenueNote: `На 3,5% ниже нормы ${fmtRu(CURRENCY_NORM)}`,
    kpiAverage: "Средний заказ",
    kpiAverageNote: `${ORDERS} заказ-нарядов · норма ${fmtRu(AVERAGE_NORM)}`,
    kpiLoad: "Загрузка сервиса",
    kpiLoadNote: `Занято ${BAYS_USED} из ${BAYS_TOTAL} постов`,
    kpiNet: "Чистая прибыль",
    kpiNetNote: "11,9% от выручки",
    hoursTitle: "Выручка по часам",
    hoursNote: "Пик в 15:00, провал в 13:00 — обычный обеденный.",
    pnlTitle: "P&L дня",
    pnlRevenue: "Выручка",
    pnlParts: "− Себестоимость запчастей (45%)",
    pnlWages: "− Зарплата механиков (сделка 18%)",
    pnlAcquiring: "− Эквайринг (1,2%)",
    pnlTax: "− Налог (резерв 3%)",
    pnlGross: "= Валовая маржа",
    pnlFixed: "− Фикс/день (аренда, коммуналка, админ, охрана)",
    pnlNet: "= Чистая прибыль дня",
    topTitle: "Топ работ",
    topCount: "Кол-во",
    topSum: "Выручка",
    jobOil: "Замена масла и фильтров",
    jobBrakes: "Замена тормозных колодок",
    jobCooling: "Ремонт системы охлаждения",
    jobSuspension: "Диагностика подвески",
    jobTyres: "Сезонный шиномонтаж",
    mixTitle: "Из чего состояли заказ-наряды",
    mixLabourOnly: "Только работы",
    mixLabourParts: "Работы и запчасти",
    mixPartsOnly: "Только запчасти",
    planTitle: `Плановое ТО — план ${SERVICE_PLAN.plan} машин в день`,
    planNote: `${SERVICE_PLAN.done} из ${SERVICE_PLAN.plan} · третий день ниже плана`,
    monthTitle: "Накопленный итог месяца (1–22 ноября)",
    monthRevenue: "Выручка",
    monthOrders: "Заказ-нарядов",
    monthProfit: "Прибыль",
    monthForecast: "Прогноз месяца",
    monthForecastNote: "По среднему за последние 30 дней",
    monthDays: `${MONTH.days} рабочих дней`,
    signalsTitle: "Сигналы дня",
    signal1: `Выручка на 3,5% ниже нормы (${fmtRu(CURRENCY_DAY)} против ${fmtRu(CURRENCY_NORM)}), но прибыль удержалась: средний заказ вырос на 2,1%. Машин меньше, работы дороже.`,
    signal2:
      "Запчасти — 45% выручки против обычных 41%. Проверьте, не ушли ли последние закупки к дорогому поставщику.",
    signal3: `Два поста простояли весь день (загрузка ${LOAD}%) — отмены или незаполненные окна?`,
    signal4: `Плановое ТО — ${SERVICE_PLAN.done} из ${SERVICE_PLAN.plan}, третий день подряд ниже плана.`,
    signal5:
      "Четыре заказ-наряда — запчасти без работ. Продажа через стойку или неоформленные работы?",
    risksTitle: "Риски",
    risk1:
      "Если доля запчастей закрепится на 45%, месяц закроется примерно на 380 000 ₸ ниже прогноза.",
    risk2:
      "Два простаивающих поста — около 90 000 ₸ выручки в день по среднему нормо-часу.",
    risk3:
      "Третий день недобора по ТО означает, что следующий месяц начнётся с пустой записи.",
    actionsTitle: "Что сделать",
    action1:
      "Сверить закупочные цены по трём последним накладным на колодки и фильтры.",
    action2:
      "Завтра до 10:00 прозвонить отменившихся и предложить свободные окна на 14:00 и 16:00.",
    action3:
      "Отправить напоминание о ТО 23 машинам, у которых срок подошёл за последние 30 дней.",
    ideaTitle: "Идея дня",
    idea: "Сезонный пакет: шиномонтаж, проверка тормозов и салонный фильтр за 28 900 ₸ вместо 34 500. Он заполняет посты, которые простаивают днём, — там, где и проседает день.",
    askTitle: "Задайте вопрос по отчёту",
    askText:
      "Выберите пример или напишите свой. Демо отвечает на три заготовленных вопроса и никуда не отправляет данные.",
    placeholder: "Например: почему выручка ниже нормы?",
    send: "Спросить",
    examples: "Попробуйте спросить",
    qProfit: "Почему выручка ниже нормы?",
    qWorkload: "Где сегодня просела загрузка?",
    qFirstStep: "Что проверить в первую очередь?",
    responseLabel: "Ответ ассистента",
    sources: `Основа: учебный журнал · ${ORDERS} заказ-нарядов · выручка, запчасти и ФОТ`,
    profitAnswer: `Выручка ${fmtRu(CURRENCY_DAY)} против нормы ${fmtRu(CURRENCY_NORM)} — на 3,5% ниже. Разница в количестве, а не в цене: средний заказ вырос на 2,1%, то есть машин проехало меньше. Чистая прибыль всё равно вышла ${fmtRu(NET)}, потому что фикс дня закрылся уже к 15:00.`,
    workloadAnswer: `Заняты были 7 постов из 9 — загрузка ${LOAD}%. Провал приходится на 13:00–14:00 и после 17:00. Два поста простояли весь день: проверьте отмены и незаполненные окна до завтрашней смены.`,
    firstStepAnswer:
      "Запчасти — 45% выручки против обычных 41%. За день это около 51 000 ₸, больше всего остального на этой странице. Начните с трёх последних накладных.",
    unknownAnswer:
      "В прототипе распознаются только три примера ниже. Подключённых данных и работающей модели здесь нет. Выберите пример, чтобы увидеть, как выглядит ответ с указанием основы.",
    disclosure:
      "Только прототип. Все цифры здесь придуманы для проверки интерфейса; подключения к системам бизнеса нет, и это не тот ассистент, который работает у клиентов.",
    questionHint: "Ответ появится здесь",
    questionRequired: "Введите вопрос или выберите пример.",
    generated: "Сформировано ассистентом директора · образец 22.11.2026 20:30",
  },
} as const;

function fmtRu(value: number): string {
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₸`;
}

function fmtEn(value: number): string {
  return `KZT ${new Intl.NumberFormat("en-US").format(value)}`;
}

export default function DirectorAssistantDemo() {
  const { lang } = useLanguage();
  const t = lang === "ru" ? copy.ru : copy.en;
  const money = lang === "ru" ? fmtRu : fmtEn;
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AnswerKey | "unknown" | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  function resolve(text: string): AnswerKey | "unknown" {
    const q = text.toLowerCase();
    if (/приб|выруч|норм|profit|revenue|norm/.test(q)) return "profit";
    if (/загруз|пост|окн|load|bay|slot/.test(q)) return "workload";
    if (/перв|начать|провер|first|check|start/.test(q)) return "firstStep";
    return "unknown";
  }

  function ask(text: string) {
    if (!text.trim()) {
      setHint(t.questionRequired);
      return;
    }
    setHint(null);
    setAnswer(resolve(text));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    ask(question);
  }

  const answerText =
    answer === "profit"
      ? t.profitAnswer
      : answer === "workload"
        ? t.workloadAnswer
        : answer === "firstStep"
          ? t.firstStepAnswer
          : answer === "unknown"
            ? t.unknownAnswer
            : null;

  const examples: ReadonlyArray<[AnswerKey, string]> = [
    ["profit", t.qProfit],
    ["workload", t.qWorkload],
    ["firstStep", t.qFirstStep],
  ];

  return (
    <section className="bg-gray-50 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden />
          {t.back}
        </Link>

        <p className="mt-8 text-xs font-medium uppercase tracking-wide text-gray-500">
          {t.eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
          {t.title}
        </h1>
        <p className="mt-3 max-w-2xl text-gray-600">{t.intro}</p>

        {/* The report itself, on its own sheet. */}
        <article className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-100 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-gray-900">{t.shop}</h2>
            <p className="text-sm text-gray-500">{t.day}</p>
            <p className="w-full text-xs font-medium uppercase tracking-wide text-amber-700">
              {t.demoBadge}
            </p>
          </header>

          <div className="space-y-8 px-5 py-6 sm:px-6">
            {/* Day against its norm */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                { label: t.kpiRevenue, value: money(CURRENCY_DAY), note: t.kpiRevenueNote },
                { label: t.kpiAverage, value: money(AVERAGE), note: t.kpiAverageNote },
                { label: t.kpiLoad, value: `${LOAD}%`, note: t.kpiLoadNote },
                { label: t.kpiNet, value: money(NET), note: t.kpiNetNote },
              ].map((kpi) => (
                <div key={kpi.label}>
                  <p className="text-xs text-gray-500">{kpi.label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">
                    {kpi.value}
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-500">{kpi.note}</p>
                </div>
              ))}
            </div>

            {/* Revenue by hour */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900">{t.hoursTitle}</h3>
              {/* Each column is full height so the bar's percentage has
                  something definite to resolve against; the bar itself lives in
                  a flex-1 box above the label, which is what makes the bars sit
                  on one baseline. */}
              <div className="mt-4 flex h-32 gap-1.5" aria-hidden>
                {HOURS.map(([hour, value]) => (
                  <div key={hour} className="flex h-full flex-1 flex-col">
                    <div className="flex flex-1 items-end">
                      <div
                        className="w-full rounded-t bg-gray-900/80"
                        style={{ height: `${Math.round((value / HOUR_MAX) * 100)}%` }}
                      />
                    </div>
                    <span className="mt-1 text-center text-[10px] text-gray-500">
                      {hour}
                    </span>
                  </div>
                ))}
              </div>
              <ul className="sr-only">
                {HOURS.map(([hour, value]) => (
                  <li key={hour}>{`${hour}:00 — ${money(value)}`}</li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-gray-500">{t.hoursNote}</p>
            </section>

            {/* P&L */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900">{t.pnlTitle}</h3>
              <dl className="mt-3 divide-y divide-gray-100">
                {PNL.map((row) => {
                  const strong = row.kind === "total" || row.kind === "subtotal";
                  return (
                    <div
                      key={row.key}
                      className={`flex items-baseline justify-between gap-4 py-2 ${
                        strong ? "font-semibold text-gray-900" : "text-gray-600"
                      }`}
                    >
                      <dt className="text-sm leading-relaxed">
                        {t[row.key as keyof typeof t] as string}
                      </dt>
                      <dd className="shrink-0 text-sm tabular-nums">
                        {row.value < 0 ? `−${money(Math.abs(row.value))}` : money(row.value)}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </section>

            {/* Top jobs */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900">{t.topTitle}</h3>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th scope="col" className="pb-2 text-left font-normal">
                      &nbsp;
                    </th>
                    <th scope="col" className="pb-2 text-right font-normal">
                      {t.topCount}
                    </th>
                    <th scope="col" className="pb-2 text-right font-normal">
                      {t.topSum}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {TOP_JOBS.map((job) => (
                    <tr key={job.key}>
                      <td className="py-2 text-gray-700">
                        {t[job.key as keyof typeof t] as string}
                      </td>
                      <td className="py-2 text-right tabular-nums text-gray-600">
                        {job.count}
                      </td>
                      <td className="py-2 text-right tabular-nums text-gray-900">
                        {money(job.sum)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Order mix and the servicing plan */}
            <div className="grid gap-6 sm:grid-cols-2">
              <section>
                <h3 className="text-sm font-semibold text-gray-900">{t.mixTitle}</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  {[
                    [t.mixLabourOnly, MIX.labourOnly],
                    [t.mixLabourParts, MIX.labourParts],
                    [t.mixPartsOnly, MIX.partsOnly],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex justify-between gap-4">
                      <dt className="text-gray-600">{label}</dt>
                      <dd className="tabular-nums text-gray-900">{value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-900">{t.planTitle}</h3>
                <div className="mt-3 h-2 w-full rounded-full bg-gray-100" aria-hidden>
                  <div
                    className="h-2 rounded-full bg-amber-500"
                    style={{
                      width: `${Math.round((SERVICE_PLAN.done / SERVICE_PLAN.plan) * 100)}%`,
                    }}
                  />
                </div>
                <p className="mt-2 text-sm text-gray-600">{t.planNote}</p>
              </section>
            </div>

            {/* Month to date */}
            <section>
              <h3 className="text-sm font-semibold text-gray-900">{t.monthTitle}</h3>
              <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: t.monthRevenue, value: money(MONTH.revenue), note: t.monthDays },
                  { label: t.monthOrders, value: String(MONTH.orders), note: "" },
                  { label: t.monthProfit, value: money(MONTH.profit), note: "" },
                  {
                    label: t.monthForecast,
                    value: money(MONTH.forecast),
                    note: t.monthForecastNote,
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <p className="text-xs text-gray-500">{item.label}</p>
                    <p className="mt-1 text-base font-semibold tabular-nums text-gray-900">
                      {item.value}
                    </p>
                    {item.note && <p className="mt-1 text-xs text-gray-500">{item.note}</p>}
                  </div>
                ))}
              </div>
            </section>

            {/* The part people actually read */}
            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Search className="h-4 w-4" strokeWidth={2} aria-hidden />
                {t.signalsTitle}
              </h3>
              <ul className="mt-3 space-y-2.5">
                {SIGNALS.map((key) => (
                  <li key={key} className="text-sm leading-relaxed text-gray-700">
                    {t[key]}
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl bg-amber-50 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                <TriangleAlert className="h-4 w-4" strokeWidth={2} aria-hidden />
                {t.risksTitle}
              </h3>
              <ul className="mt-3 space-y-2.5">
                {RISKS.map((key) => (
                  <li key={key} className="text-sm leading-relaxed text-amber-900/90">
                    {t[key]}
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <ListChecks className="h-4 w-4" strokeWidth={2} aria-hidden />
                {t.actionsTitle}
              </h3>
              <ol className="mt-3 space-y-2.5">
                {ACTIONS.map((key) => (
                  <li key={key} className="text-sm leading-relaxed text-gray-700">
                    {t[key]}
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-xl border border-gray-200 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                <Lightbulb className="h-4 w-4" strokeWidth={2} aria-hidden />
                {t.ideaTitle}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">{t.idea}</p>
            </section>

            <p className="border-t border-gray-100 pt-4 text-xs text-gray-400">
              {t.generated}
            </p>
          </div>
        </article>

        {/* Questions about the report */}
        <section className="mt-8 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <CircleHelp className="h-5 w-5" strokeWidth={2} aria-hidden />
            {t.askTitle}
          </h2>
          <p className="mt-2 text-sm text-gray-600">{t.askText}</p>

          <p className="mt-5 text-xs font-medium uppercase tracking-wide text-gray-500">
            {t.examples}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {examples.map(([key, text]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setQuestion(text);
                  setHint(null);
                  setAnswer(key);
                }}
                className="rounded-full border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:border-gray-400 hover:bg-gray-50"
              >
                {text}
              </button>
            ))}
          </div>

          <form onSubmit={onSubmit} className="mt-4 flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t.placeholder}
              aria-label={t.askTitle}
              className="w-full rounded-lg border border-gray-200 p-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            <button
              type="submit"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            >
              <Send className="h-4 w-4" strokeWidth={2} aria-hidden />
              {t.send}
            </button>
          </form>

          {hint && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {hint}
            </p>
          )}

          <div className="mt-5 rounded-xl bg-gray-50 p-4" aria-live="polite">
            {answerText ? (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t.responseLabel}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-gray-800">{answerText}</p>
                {answer !== "unknown" && (
                  <p className="mt-3 text-xs text-gray-500">{t.sources}</p>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-400">{t.questionHint}</p>
            )}
          </div>
        </section>

        <p className="mt-6 text-xs leading-relaxed text-gray-500">{t.disclosure}</p>
      </div>
    </section>
  );
}
