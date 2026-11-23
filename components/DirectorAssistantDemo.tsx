"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CircleHelp,
  Headphones,
  ListChecks,
  Send,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import { useLanguage } from "@/lib/language-context";

/**
 * The dealership director's daily report, with everything invented.
 *
 * Modelled on the real one Rustem reads every evening. Two things about it
 * matter more than the list of blocks, and both are reproduced here:
 *
 *  - a section heading is a finding with a number in it, not a label. "Seven
 *    of eighteen cars no longer cover their interest" is the heading; the
 *    table under it is the evidence.
 *  - half of it is not money but discipline: response time against the SLA,
 *    rejections closed without a call, agreements never written into the CRM,
 *    and the call scorecard that shows which step of the script is skipped.
 *
 * Everything on this page is fictional: the dealership, the managers, the
 * models, every figure. It is a prototype of the interface, it connects to
 * nothing, and it says so three times. Do not wire it to real data and do not
 * present it as the working assistant.
 */

const MONTH = { day: 23, days: 30 };

type Direction = {
  key: string;
  plan: number;
  fact: number;
  forecast: number;
  unit: "pcs" | "money";
};

const DIRECTIONS: readonly Direction[] = [
  { key: "dirNew", plan: 6, fact: 3, forecast: 6, unit: "pcs" },
  { key: "dirService", plan: 42_000_000, fact: 31_400_000, forecast: 41_000_000, unit: "money" },
  { key: "dirUsed", plan: 5, fact: 2, forecast: 4, unit: "pcs" },
  { key: "dirFinance", plan: 18_000_000, fact: 12_200_000, forecast: 16_000_000, unit: "money" },
];

const PROFIT = { plan: 60_000_000, forecast: 54_000_000 };

const STOCK = {
  total: 18,
  underwater: 7,
  loss: 28_400_000,
  charged: 14,
  perMonth: 15_600_000,
  perDay: 312_000,
};

const FUNNEL = [
  { key: "funnelLeads", value: 426 },
  { key: "funnelVisits", value: 112 },
  { key: "funnelDrives", value: 38 },
  { key: "funnelOffers", value: 21 },
  { key: "funnelContracts", value: 7 },
] as const;

const SOURCES = [
  { key: "srcSite", value: 168 },
  { key: "srcMeta", value: 121 },
  { key: "srcCalls", value: 84 },
  { key: "srcWalkIn", value: 53 },
] as const;

const SLA = { target: 90, actual: 86, leads: 426, inTime: 367, median: 6, lateToday: 2 };

/** The nine checklist items a call is scored against. */
const SCRIPT = [
  "s1",
  "s2",
  "s3",
  "s4",
  "s5",
  "s6",
  "s7",
  "s8",
  "s9",
] as const;

const SCRIPT_ALL = [98, 76, 41, 49, 10, 20, 45, 51, 10];

type Manager = {
  key: string;
  scored: number;
  score: number;
  week: number;
  items: number[];
  leads: number;
  sla: number;
  drives: number;
  contracts: number;
};

const MANAGERS: readonly Manager[] = [
  {
    key: "mgr1",
    scored: 25,
    score: 46,
    week: 51,
    items: [100, 80, 48, 52, 0, 12, 48, 56, 16],
    leads: 164,
    sla: 91,
    drives: 18,
    contracts: 3,
  },
  {
    key: "mgr2",
    scored: 12,
    score: 44,
    week: 39,
    items: [100, 92, 8, 58, 33, 17, 42, 50, 0],
    leads: 142,
    sla: 84,
    drives: 11,
    contracts: 2,
  },
  {
    key: "mgr3",
    scored: 11,
    score: 50,
    week: 37,
    items: [100, 73, 64, 36, 0, 27, 45, 45, 9],
    leads: 120,
    sla: 79,
    drives: 9,
    contracts: 2,
  },
];

const CALLS = { scored: 51, average: 44 };

const WEAK = [
  { key: "weak1", manager: "mgr2", score: 33, seconds: 175 },
  { key: "weak2", manager: "mgr3", score: 28, seconds: 212 },
] as const;

const REJECTS = { total: 426, unproven: 140, noAttempts: 115 };

const PRIORITIES = ["prio1", "prio2", "prio3"] as const;
const RISKS = ["risk1", "risk2", "risk3", "risk4"] as const;
const ACTIONS = ["action1", "action2", "action3"] as const;
const BETTER = ["better1", "better2", "better3"] as const;
const WORSE = ["worse1", "worse2", "worse3"] as const;

type AnswerKey = "plan" | "leads" | "firstStep";

const copy = {
  en: {
    back: "All assistants",
    eyebrow: "Interactive prototype",
    title: "The dealership report, the way it actually arrives.",
    intro:
      "What a dealer principal reads every evening: the month against its plan, where the leads are lost, how the team actually speaks to customers — and what to do tomorrow morning. Every figure here is invented.",
    demoBadge: "Sample data · fictional dealership",
    shop: "Turan Avenue Motors",
    period: `Sales · November · ${MONTH.day} of ${MONTH.days} days gone`,

    planTitle: "Plan, actual and forecast by department",
    dirNew: "New cars · handovers",
    dirService: "Service, parts, accessories",
    dirUsed: "Used cars",
    dirFinance: "Finance and insurance",
    colPlan: "Plan",
    colFact: "Actual",
    colForecast: "Forecast",
    profitLine: "Net profit forecast",
    profitNote: "Against a plan of",

    stockTitle: `${STOCK.underwater} of ${STOCK.total} cars in stock no longer cover their interest: minus ${fmtEn(STOCK.loss)}`,
    stockNote: `Interest runs on ${STOCK.charged} cars — ${fmtEn(STOCK.perMonth)} a month, ${fmtEn(STOCK.perDay)} a day. It starts on day 61 in stock at 18% a year and eats the 10% margin before the car is sold.`,

    funnelTitle: "Where customers come from and how far they get",
    funnelLeads: "Enquiries",
    funnelVisits: "Visits",
    funnelDrives: "Test drives",
    funnelOffers: "Written offers",
    funnelContracts: "Contracts",
    srcSite: "Website",
    srcMeta: "Meta",
    srcCalls: "Calls",
    srcWalkIn: "Walk-in",
    sourcesTitle: "Traffic by source",

    slaTitle: `40-minute SLA: ${SLA.actual}% of leads this month against a ${SLA.target}% target`,
    slaNote: `${SLA.inTime} of ${SLA.leads} leads picked up inside 40 minutes, median 6 minutes. Late or still untouched today: ${SLA.lateToday}.`,

    callsTitle: `Call scoring averages ${CALLS.average}%: the configurator is offered in 10% of calls, the address in 10%, a test drive in 20%`,
    callsNote: `${CALLS.scored} calls scored this month against the nine-step script. A green cell means the step was done in that share of the manager's calls.`,
    colManager: "Manager",
    colScored: "Scored",
    colScore: "Score",
    colWeek: "7 days",
    s1: "Greeting, name, role",
    s2: "Model",
    s3: "Invited to the showroom",
    s4: "Customer's city",
    s5: "Configurator",
    s6: "Test drive",
    s7: "Trade-in",
    s8: "Finance, instalments, insurance",
    s9: "Address",
    scriptAll: "Everyone, this month",
    mgr1: "Askhat Y.",
    mgr2: "Daniyar S.",
    mgr3: "Ilyas T.",

    ratingTitle: "Manager ranking",
    ratingNote: "Sorted by the last seven days of call scoring — the number that moves fastest.",
    colLeads: "Leads",
    colSla: "SLA",
    colCalls: "Calls",
    colDrives: "Test drives",
    colContracts: "Contracts",

    weakTitle: "Weak calls over seven days",
    weakNote: "Scored 34% or below and longer than a minute — the ones worth listening to.",
    weak1: "Outbound · new lead · price request",
    weak2: "Outbound · follow-up after a visit",
    sec: "s",

    rejectsTitle: `${REJECTS.total} rejections this month: ${REJECTS.unproven} with nothing to back them (${Math.round((REJECTS.unproven / REJECTS.total) * 100)}%)`,
    rejectsNote: `${REJECTS.noAttempts} were closed as "not answering" without three call attempts on different days. A rejection counts only when the customer was called from the showroom line and the reason is in the comment.`,

    prioTitle: "Priorities for tomorrow",
    prio1: `Rejections without evidence: ${REJECTS.unproven} to review, ${WEAK.length === 2 ? 11 : 11} of them hot. Send back to the manager anything with no call from the line.`,
    prio2: "Rule 17 breached twice today — \"not answering\" with fewer than three attempts. Do not confirm; call the customer.",
    prio3: "Push the 14 live offers: a decision date and a next step on each, checked daily.",
    risksTitle: "Risks",
    risk1: `At ${SLA.actual}% the SLA misses the ${SLA.target}% target, and the target is a condition of the importer's Q4 programme.`,
    risk2: "The configurator is offered in one call out of ten. It is the step that turns a price question into a visit.",
    risk3: `Interest on stock grows by ${fmtEn(STOCK.perDay)} a day. Seven cars are already past the point where the margin covers it.`,
    risk4: "Showroom cameras counted 122 entries this month against 34 visits in the CRM. Some are staff, but the gap is customers nobody logged.",
    actionsTitle: "Recommendations",
    action1: "Add the configurator to the script check and review it at the Monday meeting — it is the cheapest point of growth on this page.",
    action2: "Sell the two worst stock cars first: their interest alone exceeds the discount it would take to move them.",
    action3: "Give reception a rule for night enquiries — the first lead of the day is created at 09:57, and the customer wrote at 23:40.",

    weekTitle: "Week against week",
    betterTitle: "Improved",
    better1: "Contracts: 7 against 5",
    better2: "SLA: +4 points",
    better3: "Call-backs on missed calls: +12%",
    worseTitle: "Worse",
    worse1: "Configurator offered: −6 points",
    worse2: "Showroom visits: −9",
    worse3: "Missed calls with no call-back: 32%",

    askTitle: "Ask about the report",
    askText:
      "Pick an example or type your own. This demo answers three prepared questions and sends nothing anywhere.",
    placeholder: "For example: why is the plan at risk?",
    send: "Ask",
    examples: "Try asking",
    qPlan: "Why is the monthly plan at risk?",
    qLeads: "Where are we losing leads?",
    qFirstStep: "What should I check first?",
    responseLabel: "Assistant response",
    sources: "Basis: sample CRM, telephony and 1C ledgers · November",
    planAnswer: `Three handovers of six with ${MONTH.days - MONTH.day} days left. The forecast still says six, because four contracts are signed and the cars are here — the risk is not demand, it is paperwork and delivery dates. Net profit is forecast at ${fmtEn(PROFIT.forecast)} against a plan of ${fmtEn(PROFIT.plan)}, and the gap is almost exactly the interest accrued on stock.`,
    leadsAnswer: `Between the enquiry and the visit: 426 enquiries became 112 visits. Two causes are visible on this page — the SLA at ${SLA.actual}% against a ${SLA.target}% target, and the configurator offered in 10% of calls. The second is cheaper to fix and moves the same number.`,
    firstStepAnswer: `The ${REJECTS.unproven} rejections with nothing behind them. A third of the month's rejections were closed without a call from the line, which means the funnel above is measuring a smaller market than you actually have.`,
    unknownAnswer:
      "This prototype recognizes only the three sample questions below. It has no connected data and no live model. Pick one to see how an answer with its basis would look.",
    disclosure:
      "Prototype only. The dealership, the managers, the models and every figure are invented for interface testing. Nothing here is connected to a CRM, a telephony system or 1C, and this is not the working assistant.",
    questionHint: "The response appears here",
    questionRequired: "Type a question or choose an example.",
    generated: "Generated by the director's assistant · sample 23.11.2026 20:30",
  },
  ru: {
    back: "Все ассистенты",
    eyebrow: "Интерактивный прототип",
    title: "Отчёт дилерского центра — так, как он приходит.",
    intro:
      "То, что директор салона читает каждый вечер: месяц против плана, где теряются клиенты, как команда на самом деле разговаривает — и что делать завтра утром. Все цифры здесь вымышлены.",
    demoBadge: "Учебные данные · вымышленный салон",
    shop: "Автоцентр на Туран",
    period: `Продажи · ноябрь · прошло ${MONTH.day} из ${MONTH.days} дн.`,

    planTitle: "План, факт и прогноз по направлениям",
    dirNew: "Новые автомобили · выдачи",
    dirService: "Сервис, запчасти, аксессуары",
    dirUsed: "Автомобили с пробегом",
    dirFinance: "Финансовые услуги",
    colPlan: "План",
    colFact: "Факт",
    colForecast: "Прогноз",
    profitLine: "Прогноз чистой прибыли",
    profitNote: "при плане",

    stockTitle: `${STOCK.underwater} из ${STOCK.total} машин склада уже не окупают проценты: минус ${fmtRu(STOCK.loss)}`,
    stockNote: `Проценты идут по ${STOCK.charged} машинам — ${fmtRu(STOCK.perMonth)} в месяц, ${fmtRu(STOCK.perDay)} в день. Начисляются с 61-го дня на складе под 18% годовых и съедают маржу 10% ещё до продажи.`,

    funnelTitle: "Откуда приходят клиенты и как далеко доходят",
    funnelLeads: "Обращения",
    funnelVisits: "Визиты",
    funnelDrives: "Тест-драйвы",
    funnelOffers: "КП",
    funnelContracts: "Контракты",
    srcSite: "Сайт",
    srcMeta: "Meta",
    srcCalls: "Звонки",
    srcWalkIn: "Трафик салона",
    sourcesTitle: "Трафик по источникам",

    slaTitle: `SLA 40 минут: ${SLA.actual}% листов за месяц при цели ${SLA.target}%`,
    slaNote: `${SLA.inTime} из ${SLA.leads} листов взяты в работу за 40 минут, медиана 6 минут. Сегодня позже срока или ещё не взяты — ${SLA.lateToday}.`,

    callsTitle: `Средняя оценка разговоров ${CALLS.average}%: конфигуратор звучит в 10% звонков, адрес — в 10%, тест-драйв — в 20%`,
    callsNote: `За месяц оценён ${CALLS.scored} разговор по анкете из девяти пунктов. Процент в ячейке — в скольких разговорах менеджера пункт выполнен.`,
    colManager: "Сотрудник",
    colScored: "Оценено",
    colScore: "Оценка",
    colWeek: "7 дней",
    s1: "Приветствие, имя, должность",
    s2: "Модель",
    s3: "Пригласил в салон",
    s4: "Город клиента",
    s5: "Конфигуратор",
    s6: "Тест-драйв",
    s7: "Трейд-ин",
    s8: "Кредит, рассрочка, страховка",
    s9: "Адрес",
    scriptAll: "Все за месяц",
    mgr1: "Асхат Е.",
    mgr2: "Данияр С.",
    mgr3: "Ильяс Т.",

    ratingTitle: "Рейтинг менеджеров",
    ratingNote: "Отсортированы по оценке разговоров за последние 7 дней — это цифра, которая меняется быстрее всех.",
    colLeads: "Листов",
    colSla: "SLA",
    colCalls: "Разговоры",
    colDrives: "Тест-драйвы",
    colContracts: "Контракты",

    weakTitle: "Слабые разговоры за 7 дней",
    weakNote: "Оценка 34% и ниже, дольше минуты — те, которые стоит послушать.",
    weak1: "Исходящий · новый лид · запрос цены",
    weak2: "Исходящий · после визита",
    sec: "с",

    rejectsTitle: `${REJECTS.total} отказов за месяц: без доказательств ${REJECTS.unproven} (${Math.round((REJECTS.unproven / REJECTS.total) * 100)}%)`,
    rejectsNote: `${REJECTS.noAttempts} из них поставлены как «не отвечает» без трёх попыток дозвона в разные дни. Отказ засчитывается, только если клиенту звонили с линии салона и причина записана в комментарии.`,

    prioTitle: "Приоритеты на завтра",
    prio1: `Отказы без доказательств: разобрать ${REJECTS.unproven}, из них горячих 11. Всё, где нет звонка с линии, вернуть менеджеру.`,
    prio2: "Дважды за сегодня нарушено правило №17 — «не отвечает» меньше чем с трёх попыток. Не подтверждать, дозвониться клиенту.",
    prio3: "Дожать 14 активных КП: по каждому дата решения и следующий шаг, ежедневный контроль.",
    risksTitle: "Риски",
    risk1: `SLA ${SLA.actual}% не дотягивает до цели ${SLA.target}%, а цель — условие программы импортёра на Q4.`,
    risk2: "Конфигуратор звучит в одном звонке из десяти. Это тот шаг, который превращает вопрос о цене в визит.",
    risk3: `Проценты по складу растут на ${fmtRu(STOCK.perDay)} в день. По семи машинам маржа их уже не покрывает.`,
    risk4: "Камеры насчитали 122 входа в салон за месяц против 34 визитов в CRM. Часть — сотрудники, но разрыв это клиенты, которых не завели.",
    actionsTitle: "Рекомендации",
    action1: "Вынести конфигуратор в проверку скрипта и разобрать на планёрке — это самая дешёвая точка роста на этой странице.",
    action2: "Продавать первыми две худшие машины склада: проценты по ним уже больше скидки, которая их сдвинет.",
    action3: "Дать ресепшену правило по ночным заявкам: первый лист дня заводится в 09:57, а клиент написал в 23:40.",

    weekTitle: "Неделя к неделе",
    betterTitle: "Улучшилось",
    better1: "Контракты: 7 против 5",
    better2: "SLA: +4 пункта",
    better3: "Перезвоны по пропущенным: +12%",
    worseTitle: "Ухудшилось",
    worse1: "Конфигуратор в разговоре: −6 пунктов",
    worse2: "Визиты в салон: −9",
    worse3: "Пропущенные без перезвона: 32%",

    askTitle: "Задайте вопрос по отчёту",
    askText:
      "Выберите пример или напишите свой. Демо отвечает на три заготовленных вопроса и никуда не отправляет данные.",
    placeholder: "Например: почему план под угрозой?",
    send: "Спросить",
    examples: "Попробуйте спросить",
    qPlan: "Почему план месяца под угрозой?",
    qLeads: "Где мы теряем клиентов?",
    qFirstStep: "Что проверить в первую очередь?",
    responseLabel: "Ответ ассистента",
    sources: "Основа: учебные выгрузки CRM, телефонии и 1С · ноябрь",
    planAnswer: `Выдано 3 из 6, осталось ${MONTH.days - MONTH.day} дней. Прогноз всё ещё 6, потому что четыре контракта подписаны и машины на месте — риск не в спросе, а в оформлении и сроках выдачи. Чистая прибыль прогнозируется ${fmtRu(PROFIT.forecast)} при плане ${fmtRu(PROFIT.plan)}, и разрыв почти точно равен начисленным процентам по складу.`,
    leadsAnswer: `Между обращением и визитом: из 426 обращений визитов 112. Две причины видны прямо на этой странице — SLA ${SLA.actual}% при цели ${SLA.target}% и конфигуратор в 10% разговоров. Второе дешевле исправить, а двигает те же цифры.`,
    firstStepAnswer: `${REJECTS.unproven} отказов, за которыми ничего нет. Треть месячных отказов закрыта без звонка с линии — значит воронка выше меряет рынок меньше того, который у вас есть.`,
    unknownAnswer:
      "В прототипе распознаются только три примера ниже. Подключённых данных и работающей модели здесь нет. Выберите пример, чтобы увидеть, как выглядит ответ с указанием основы.",
    disclosure:
      "Только прототип. Салон, менеджеры, модели и все цифры придуманы для проверки интерфейса. Подключения к CRM, телефонии и 1С здесь нет, и это не тот ассистент, который работает у клиентов.",
    questionHint: "Ответ появится здесь",
    questionRequired: "Введите вопрос или выберите пример.",
    generated: "Сформировано ассистентом директора · образец 23.11.2026 20:30",
  },
} as const;

function fmtRu(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(m)} млн ₸`;
  }
  if (value >= 1000) {
    return `${new Intl.NumberFormat("ru-RU").format(Math.round(value / 1000))} тыс. ₸`;
  }
  return `${new Intl.NumberFormat("ru-RU").format(value)} ₸`;
}

function fmtEn(value: number): string {
  if (value >= 1_000_000) {
    const m = value / 1_000_000;
    return `KZT ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(m)}m`;
  }
  if (value >= 1000) {
    return `KZT ${new Intl.NumberFormat("en-US").format(Math.round(value / 1000))}k`;
  }
  return `KZT ${new Intl.NumberFormat("en-US").format(value)}`;
}

/** Green when the step is done often, amber in the middle, red when it is skipped. */
function cellTone(share: number): string {
  if (share >= 70) return "bg-emerald-50 text-emerald-900";
  if (share >= 35) return "bg-amber-50 text-amber-900";
  return "bg-red-50 text-red-900";
}

export default function DirectorAssistantDemo() {
  const { lang } = useLanguage();
  const t = lang === "ru" ? copy.ru : copy.en;
  const money = lang === "ru" ? fmtRu : fmtEn;
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<AnswerKey | "unknown" | null>(null);
  const [hint, setHint] = useState<string | null>(null);

  const label = (key: string) => t[key as keyof typeof t] as string;
  const funnelMax = FUNNEL[0].value;
  const sourcesMax = Math.max(...SOURCES.map((s) => s.value));
  const ranking = [...MANAGERS].sort((a, b) => b.week - a.week);

  function resolve(text: string): AnswerKey | "unknown" {
    const q = text.toLowerCase();
    if (/план|прибыл|выдач|прогноз|plan|profit|forecast/.test(q)) return "plan";
    if (/лид|клиент|воронк|визит|теря|lead|funnel|lose|visit/.test(q)) return "leads";
    if (/перв|провер|начать|first|check|start/.test(q)) return "firstStep";
    return "unknown";
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!question.trim()) {
      setHint(t.questionRequired);
      return;
    }
    setHint(null);
    setAnswer(resolve(question));
  }

  const answerText =
    answer === "plan"
      ? t.planAnswer
      : answer === "leads"
        ? t.leadsAnswer
        : answer === "firstStep"
          ? t.firstStepAnswer
          : answer === "unknown"
            ? t.unknownAnswer
            : null;

  const examples: ReadonlyArray<[AnswerKey, string]> = [
    ["plan", t.qPlan],
    ["leads", t.qLeads],
    ["firstStep", t.qFirstStep],
  ];

  return (
    <section className="bg-gray-50 py-10 sm:py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
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
        <p className="mt-3 max-w-3xl text-gray-600">{t.intro}</p>

        <article className="mt-8 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-gray-100 px-5 py-4 sm:px-6">
            <h2 className="text-lg font-semibold text-gray-900">{t.shop}</h2>
            <p className="text-sm text-gray-500">{t.period}</p>
            <p className="w-full text-xs font-medium uppercase tracking-wide text-amber-700">
              {t.demoBadge}
            </p>
          </header>

          <div className="space-y-10 px-5 py-6 sm:px-6">
            {/* Plan, actual, forecast */}
            <section>
              <h3 className="text-base font-semibold text-gray-900">{t.planTitle}</h3>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th scope="col" className="pb-2 text-left font-normal">&nbsp;</th>
                    <th scope="col" className="pb-2 text-right font-normal">{t.colPlan}</th>
                    <th scope="col" className="pb-2 text-right font-normal">{t.colFact}</th>
                    <th scope="col" className="pb-2 text-right font-normal">{t.colForecast}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {DIRECTIONS.map((d) => {
                    const show = (v: number) =>
                      d.unit === "money" ? money(v) : `${v}`;
                    return (
                      <tr key={d.key}>
                        <td className="py-2.5 text-gray-700">{label(d.key)}</td>
                        <td className="py-2.5 text-right tabular-nums text-gray-500">
                          {show(d.plan)}
                        </td>
                        <td className="py-2.5 text-right font-medium tabular-nums text-gray-900">
                          {show(d.fact)}
                        </td>
                        <td
                          className={`py-2.5 text-right tabular-nums ${
                            d.forecast >= d.plan ? "text-emerald-700" : "text-amber-700"
                          }`}
                        >
                          {show(d.forecast)}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="font-semibold text-gray-900">
                    <td className="py-2.5">{t.profitLine}</td>
                    <td className="py-2.5 text-right tabular-nums text-gray-500">
                      {money(PROFIT.plan)}
                    </td>
                    <td className="py-2.5" />
                    <td className="py-2.5 text-right tabular-nums text-amber-700">
                      {money(PROFIT.forecast)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Stock — the heading is the finding */}
            <section className="rounded-xl bg-amber-50 p-4">
              <h3 className="text-base font-semibold text-amber-900">{t.stockTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-amber-900/90">{t.stockNote}</p>
            </section>

            {/* Funnel and sources */}
            <section>
              <h3 className="text-base font-semibold text-gray-900">{t.funnelTitle}</h3>
              <div className="mt-4 grid gap-6 sm:grid-cols-2">
                <div>
                  <ul className="space-y-2">
                    {FUNNEL.map((step) => (
                      <li key={step.key}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="text-gray-700">{label(step.key)}</span>
                          <span className="tabular-nums text-gray-900">{step.value}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100" aria-hidden>
                          <div
                            className="h-1.5 rounded-full bg-gray-900/80"
                            style={{ width: `${Math.round((step.value / funnelMax) * 100)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {t.sourcesTitle}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {SOURCES.map((s) => (
                      <li key={s.key}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className="text-gray-700">{label(s.key)}</span>
                          <span className="tabular-nums text-gray-900">{s.value}</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-gray-100" aria-hidden>
                          <div
                            className="h-1.5 rounded-full bg-gray-400"
                            style={{ width: `${Math.round((s.value / sourcesMax) * 100)}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* SLA */}
            <section>
              <h3 className="text-base font-semibold text-gray-900">{t.slaTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{t.slaNote}</p>
              <div className="mt-3 h-2 w-full rounded-full bg-gray-100" aria-hidden>
                <div
                  className="h-2 rounded-full bg-amber-500"
                  style={{ width: `${SLA.actual}%` }}
                />
              </div>
            </section>

            {/* Call scoring — the scorecard */}
            <section>
              <h3 className="flex items-start gap-2 text-base font-semibold text-gray-900">
                <Headphones className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2} aria-hidden />
                {t.callsTitle}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{t.callsNote}</p>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500">
                      <th scope="col" className="pb-2 text-left font-normal">{t.colManager}</th>
                      <th scope="col" className="pb-2 text-right font-normal">{t.colScored}</th>
                      <th scope="col" className="pb-2 text-right font-normal">{t.colScore}</th>
                      {SCRIPT.map((s, i) => (
                        <th
                          key={s}
                          scope="col"
                          className="pb-2 text-center font-normal"
                          title={label(s)}
                        >
                          {i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="text-gray-500">
                      <td className="py-2">{t.scriptAll}</td>
                      <td className="py-2 text-right tabular-nums">{CALLS.scored}</td>
                      <td className="py-2 text-right tabular-nums">{CALLS.average}%</td>
                      {SCRIPT_ALL.map((v, i) => (
                        <td key={i} className="py-2 text-center tabular-nums">
                          {v}%
                        </td>
                      ))}
                    </tr>
                    {MANAGERS.map((m) => (
                      <tr key={m.key}>
                        <td className="py-2 text-gray-900">{label(m.key)}</td>
                        <td className="py-2 text-right tabular-nums text-gray-600">
                          {m.scored}
                        </td>
                        <td className="py-2 text-right tabular-nums text-gray-900">
                          {m.score}%
                        </td>
                        {m.items.map((v, i) => (
                          <td key={i} className="px-1 py-1 text-center">
                            <span
                              className={`block rounded px-1 py-1 text-xs tabular-nums ${cellTone(v)}`}
                            >
                              {v}%
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ol className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {SCRIPT.map((s, i) => (
                  <li key={s}>
                    {i + 1}. {label(s)}
                  </li>
                ))}
              </ol>
            </section>

            {/* Manager ranking */}
            <section>
              <h3 className="text-base font-semibold text-gray-900">{t.ratingTitle}</h3>
              <p className="mt-2 text-sm text-gray-600">{t.ratingNote}</p>
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th scope="col" className="pb-2 text-left font-normal">{t.colManager}</th>
                    <th scope="col" className="pb-2 text-right font-normal">{t.colWeek}</th>
                    <th scope="col" className="pb-2 text-right font-normal">{t.colLeads}</th>
                    <th scope="col" className="pb-2 text-right font-normal">{t.colSla}</th>
                    <th scope="col" className="pb-2 text-right font-normal">{t.colDrives}</th>
                    <th scope="col" className="pb-2 text-right font-normal">{t.colContracts}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ranking.map((m, i) => (
                    <tr key={m.key}>
                      <td className="py-2.5 text-gray-900">
                        <span className="mr-2 text-gray-400 tabular-nums">{i + 1}</span>
                        {label(m.key)}
                      </td>
                      <td className="py-2.5 text-right font-medium tabular-nums text-gray-900">
                        {m.week}%
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-gray-600">{m.leads}</td>
                      <td
                        className={`py-2.5 text-right tabular-nums ${
                          m.sla >= SLA.target ? "text-emerald-700" : "text-amber-700"
                        }`}
                      >
                        {m.sla}%
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-gray-600">{m.drives}</td>
                      <td className="py-2.5 text-right tabular-nums text-gray-900">
                        {m.contracts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            {/* Weak calls */}
            <section>
              <h3 className="text-base font-semibold text-gray-900">{t.weakTitle}</h3>
              <p className="mt-2 text-sm text-gray-600">{t.weakNote}</p>
              <ul className="mt-3 divide-y divide-gray-100">
                {WEAK.map((call) => (
                  <li
                    key={call.key}
                    className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 text-sm"
                  >
                    <span className="text-gray-900">{label(call.manager)}</span>
                    <span className="text-gray-600">{label(call.key)}</span>
                    <span className="tabular-nums text-gray-500">
                      {call.seconds} {t.sec}
                    </span>
                    <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium tabular-nums text-red-900">
                      {call.score}%
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* CRM discipline */}
            <section>
              <h3 className="text-base font-semibold text-gray-900">{t.rejectsTitle}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">{t.rejectsNote}</p>
            </section>

            {/* Priorities, risks, recommendations */}
            <section>
              <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <ListChecks className="h-5 w-5" strokeWidth={2} aria-hidden />
                {t.prioTitle}
              </h3>
              <ol className="mt-3 space-y-2.5">
                {PRIORITIES.map((key, i) => (
                  <li key={key} className="flex gap-3 text-sm leading-relaxed text-gray-700">
                    <span className="shrink-0 text-gray-400 tabular-nums">{i + 1}</span>
                    <span>{t[key]}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="rounded-xl bg-amber-50 p-4">
              <h3 className="flex items-center gap-2 text-base font-semibold text-amber-900">
                <TriangleAlert className="h-5 w-5" strokeWidth={2} aria-hidden />
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
              <h3 className="text-base font-semibold text-gray-900">{t.actionsTitle}</h3>
              <ul className="mt-3 space-y-2.5">
                {ACTIONS.map((key) => (
                  <li key={key} className="text-sm leading-relaxed text-gray-700">
                    {t[key]}
                  </li>
                ))}
              </ul>
            </section>

            {/* Week against week */}
            <section>
              <h3 className="text-base font-semibold text-gray-900">{t.weekTitle}</h3>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                    <TrendingUp className="h-4 w-4" strokeWidth={2} aria-hidden />
                    {t.betterTitle}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-gray-700">
                    {BETTER.map((key) => (
                      <li key={key}>{t[key]}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="flex items-center gap-2 text-sm font-medium text-red-700">
                    <TrendingDown className="h-4 w-4" strokeWidth={2} aria-hidden />
                    {t.worseTitle}
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-gray-700">
                    {WORSE.map((key) => (
                      <li key={key}>{t[key]}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <p className="border-t border-gray-100 pt-4 text-xs text-gray-400">{t.generated}</p>
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
