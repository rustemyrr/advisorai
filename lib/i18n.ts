export type Lang = "en" | "ru";

export const translations = {
  en: {
    // Navbar
    pricing: "Pricing",
    startFree: "Sign in",

    // Hero
    heroTag: "AI for automotive service advisors",
    heroHeadline: "Write estimates, explain repairs, and upsell — in 10 seconds.",
    heroSubtext:
      "AdvisorAI turns any repair job into a clear customer estimate, plain-language explanation, and smart upsell suggestion. No more staring at a blank page between cars.",
    heroCta: "See plans",
    heroDemo: "Try the demo",
    heroNote: "From $4/month · No setup · Works on any device",

    // DemoWidget
    defaultJob:
      "BMW 520d, 180k miles. Front brake discs + pads. Oil seal leaking on crank.",
    liveDemoLabel: "Live demo — try it now",
    liveDemoLabelLoggedIn: "Vehicle Analysis",
    liveDemoSubtitleLoggedIn: "Increase average ticket with every customer",
    generate: "Generate",
    usageLabel: (count: number, limit: number) =>
      `${count} of ${limit} free generations used this month`,
    remaining: (n: number) => `${n} generation${n === 1 ? "" : "s"} remaining this month`,
    emailModalTitle: "🔓 Get 2 more free generations",
    emailModalSubtext: "No spam. Just your email to continue.",
    emailPlaceholder: "you@dealership.com",
    continueGenerating: "Continue generating →",
    upgradeNote: "Upgrade anytime for more access",
    limitTitle: "You've reached the free limit",
    limitSubtext:
      "Upgrade to Standard or Professional for more estimates, explanations, and upsell suggestions.",
    startTrial: "View plans →",
    signInToGenerate: "Sign in to generate →",
    pleaseWait: "Please wait…",
    pleaseEnterEmail: "Please enter your email",
    outputEstimate: "Estimate",
    outputExplanation: "Plain-language explanation",
    outputUpsell: "Upsell suggestion",

    // ProblemSection
    problemTag: "The problem",
    problemHeadline:
      "Service advisors waste 20% of their day on paperwork, not customers.",
    problemSubtext:
      "Writing estimates, finding the right words for a non-technical customer, figuring out what to upsell — it all takes time and skill most advisors learn over years. AdvisorAI gives you that skill on day one.",
    card1Title: "15 min per estimate → 30 sec",
    card1Text:
      "Stop building estimates from scratch. Generate a complete, professional quote instantly.",
    card2Title: "Technical jargon → plain English",
    card2Text:
      "One click turns 'DMTL solenoid failure' into something your customer actually understands.",
    card3Title: "Never miss an upsell again",
    card3Text:
      "AI spots the right moment to offer extras based on mileage, job type, and customer history.",

    // Pricing
    pricingTag: "Pricing",
    pricingHeadline: "Simple plans for every dealership.",
    mostPopular: "Most popular",
    planStarter: "Starter",
    planStandard: "Standard",
    planProfessional: "Professional",
    perMonth: "/month",
    starterFeatures: [
      "15 generations per month",
      "1 advisor",
      "Plain-language explainer",
      "AI upsell suggestions",
      "Currency selector (KZT/RUB/USD/AED/GBP)",
      "Estimate history — 7 days",
    ],
    standardFeatures: [
      "100 generations per month",
      "1 advisor",
      "Everything in Starter",
      "Full estimate history",
      "Pricelist upload (Excel/CSV)",
    ],
    professionalFeatures: [
      "Unlimited generations",
      "Up to 3 advisor seats",
      "Everything in Standard",
      "Team analytics / dashboard",
      "Priority support",
    ],
    ctaGetStarted: "Get started",
    ctaSubscribe: "Subscribe",
    ctaContact: "Contact us",

    // FAQ
    faqHeadline: "Frequently asked questions",
    faqs: [
      {
        question: "Does it work for any brand — not just BMW or Lexus?",
        answer:
          "Yes. AdvisorAI works for any make and model. Just describe the job in plain English and it handles the rest.",
      },
      {
        question: "Do I need to connect it to my DMS?",
        answer:
          "No integration needed. You type or paste the job description — AdvisorAI generates the output instantly in your browser.",
      },
      {
        question: "Is my data stored or shared?",
        answer:
          "Job descriptions are processed to generate your output and not stored permanently. We never share your data with third parties.",
      },
      {
        question: "Can I cancel anytime?",
        answer:
          "Yes. Cancel anytime from your account settings. No contracts, no cancellation fees.",
      },
    ],

    // CTA Section
    ctaHeadline: "Try AdvisorAI free today.",
    ctaSubtext:
      "Join service advisors in UAE, UK, and US who write better estimates in less time.",
    ctaEmailPlaceholder: "you@dealership.com",
    ctaButton: "Start free",
    ctaThanks: "Thanks!",
    ctaNote: "Free to start · No credit card required",

    // Footer
    footerTagline: "Built by an ex-BMW Director · © 2026",
    footerTerms: "Terms",
    footerPrivacy: "Privacy",
    footerRefund: "Refund",

    // History
    historyTitle: "History",
    historyEmpty: "No generations yet. Try the demo above.",
    historyExpand: "Show details",
    historyCollapse: "Hide",

    // Pricelist
    pricelistTitle: "Price List",
    pricelistUpload: "Upload Excel / CSV",
    pricelistLaborRate: "Labor rate",
    pricelistSave: "Save price list",
    pricelistSaving: "Saving…",
    pricelistSaved: "Saved!",
    pricelistColService: "Service",
    pricelistColPrice: "Price",
    pricelistColHours: "Hours",
    pricelistEmpty: "No price list uploaded yet.",
    pricelistParseError: "Could not parse file. Check that it has Service, Price, and Hours columns.",

    // Testimonials
    testimonialsTag: "What advisors say",
    testimonialsHeadline:
      "Trusted by service advisors at BMW, Lexus, and Toyota dealerships.",
    testimonials: [
      {
        quote:
          "I used to spend my lunch break catching up on estimates. Now I'm done before the customer leaves the service desk.",
        name: "James M.",
        role: "Service Advisor, BMW Dubai",
      },
      {
        quote:
          "The upsell suggestions alone paid for 6 months of the subscription in the first week.",
        name: "Sarah R.",
        role: "Senior Advisor, Toyota London",
      },
    ],
  },

  ru: {
    // Navbar
    pricing: "Цены",
    startFree: "Войти",

    // Hero
    heroTag: "ИИ для автомобильных сервисных консультантов",
    heroHeadline:
      "Составляйте сметы, объясняйте ремонт и делайте допродажи — за 10 секунд.",
    heroSubtext:
      "AdvisorAI превращает любой ремонт в чёткую смету для клиента, понятное объяснение и умное предложение допродажи. Больше никакого ступора между машинами.",
    heroCta: "Смотреть планы",
    heroDemo: "Попробовать демо",
    heroNote: "От $4 в месяц · Без настройки · На любом устройстве",

    // DemoWidget
    defaultJob:
      "BMW 520d, 180 тыс. км. Передние тормозные диски + колодки. Течь сальника коленвала.",
    liveDemoLabel: "Живое демо — попробуйте прямо сейчас",
    liveDemoLabelLoggedIn: "Анализ автомобиля",
    liveDemoSubtitleLoggedIn: "Увеличьте средний чек с каждого клиента",
    generate: "Создать",
    usageLabel: (count: number, limit: number) =>
      `Использовано ${count} из ${limit} бесплатных генераций в этом месяце`,
    remaining: (n: number) => `Осталось ${n} генераци${n === 1 ? "я" : n < 5 ? "и" : "й"} в этом месяце`,
    emailModalTitle: "🔓 Получите ещё 2 бесплатные генерации",
    emailModalSubtext: "Без спама. Просто укажите email, чтобы продолжить.",
    emailPlaceholder: "вы@дилерство.рф",
    continueGenerating: "Продолжить →",
    upgradeNote: "Переходите на более высокий план для расширенного доступа",
    limitTitle: "Вы достигли лимита генераций",
    limitSubtext:
      "Перейдите на Standard или Professional для большего числа смет, объяснений и допродаж.",
    startTrial: "Смотреть планы →",
    signInToGenerate: "Войдите чтобы генерировать →",
    pleaseWait: "Подождите…",
    pleaseEnterEmail: "Введите ваш email",
    outputEstimate: "Смета",
    outputExplanation: "Объяснение простым языком",
    outputUpsell: "Предложение допродажи",

    // ProblemSection
    problemTag: "Проблема",
    problemHeadline:
      "Сервисные консультанты тратят 20% рабочего дня на бумажки, а не на клиентов.",
    problemSubtext:
      "Составлять сметы, объяснять технические моменты нетехническому клиенту, придумывать допродажи — всё это требует времени и навыков, которые приходят лишь с годами. AdvisorAI даёт вам эти навыки с первого дня.",
    card1Title: "15 мин на смету → 30 секунд",
    card1Text:
      "Забудьте про сметы с нуля. Получайте готовый профессиональный расчёт мгновенно.",
    card2Title: "Технический жаргон → понятный язык",
    card2Text:
      "Один клик — и «отказ соленоида DMTL» превращается в то, что клиент реально поймёт.",
    card3Title: "Никогда не упускайте допродажу",
    card3Text:
      "ИИ сам определяет подходящий момент для предложения допуслуг на основе пробега, типа работ и истории клиента.",

    // Pricing
    pricingTag: "Цены",
    pricingHeadline: "Простые планы для любого дилерства.",
    mostPopular: "Популярный",
    planStarter: "Starter",
    planStandard: "Standard",
    planProfessional: "Professional",
    perMonth: "/месяц",
    starterFeatures: [
      "15 генераций в месяц",
      "1 консультант",
      "Объяснение простым языком",
      "ИИ-допродажи",
      "Выбор валюты (KZT/RUB/USD/AED/GBP)",
      "История смет — 7 дней",
    ],
    standardFeatures: [
      "100 генераций в месяц",
      "1 консультант",
      "Всё из Starter",
      "Полная история смет",
      "Загрузка прайс-листа (Excel/CSV)",
    ],
    professionalFeatures: [
      "Безлимитные генерации",
      "До 3 мест для консультантов",
      "Всё из Standard",
      "Аналитика команды / дашборд",
      "Приоритетная поддержка",
    ],
    ctaGetStarted: "Начать",
    ctaSubscribe: "Подписаться",
    ctaContact: "Связаться с нами",

    // FAQ
    faqHeadline: "Часто задаваемые вопросы",
    faqs: [
      {
        question: "Работает ли для любых марок — не только BMW или Lexus?",
        answer:
          "Да. AdvisorAI работает для любой марки и модели. Просто опишите работу на обычном языке — остальное он сделает сам.",
      },
      {
        question: "Нужно ли подключать к DMS?",
        answer:
          "Интеграция не нужна. Вы вводите или вставляете описание работы — AdvisorAI мгновенно генерирует результат прямо в браузере.",
      },
      {
        question: "Хранятся ли и передаются ли мои данные?",
        answer:
          "Описания работ обрабатываются только для генерации результата и не хранятся постоянно. Мы никогда не передаём ваши данные третьим лицам.",
      },
      {
        question: "Можно ли отменить в любое время?",
        answer:
          "Да. Отменяйте в любое время в настройках аккаунта. Без контрактов и штрафов.",
      },
    ],

    // CTA Section
    ctaHeadline: "Попробуйте AdvisorAI бесплатно сегодня.",
    ctaSubtext:
      "Присоединяйтесь к сервисным консультантам из ОАЭ, Великобритании и США, которые составляют сметы быстрее.",
    ctaEmailPlaceholder: "вы@дилер.кз",
    ctaButton: "Начать бесплатно",
    ctaThanks: "Спасибо!",
    ctaNote: "Бесплатный старт · Карта не нужна",

    // Footer
    footerTagline: "Создано в Казахстане · © 2026",
    footerTerms: "Условия",
    footerPrivacy: "Конфиденциальность",
    footerRefund: "Возврат",

    // History
    historyTitle: "История запросов",
    historyEmpty: "Генераций пока нет. Попробуйте демо выше.",
    historyExpand: "Показать",
    historyCollapse: "Скрыть",

    // Pricelist
    pricelistTitle: "Прайс-лист",
    pricelistUpload: "Загрузить Excel / CSV",
    pricelistLaborRate: "Ставка н/ч",
    pricelistSave: "Сохранить прайс-лист",
    pricelistSaving: "Сохранение…",
    pricelistSaved: "Сохранено!",
    pricelistColService: "Услуга",
    pricelistColPrice: "Цена",
    pricelistColHours: "Н/ч",
    pricelistEmpty: "Прайс-лист ещё не загружен.",
    pricelistParseError: "Не удалось распознать файл. Проверьте, что есть столбцы Service, Price и Hours.",

    // Testimonials
    testimonialsTag: "Что говорят консультанты",
    testimonialsHeadline:
      "Нам доверяют сервисные консультанты BMW, Lexus и Toyota.",
    testimonials: [
      {
        quote:
          "Раньше я тратил обеденный перерыв на сметы. Теперь успеваю до того, как клиент уходит.",
        name: "James M.",
        role: "Сервисный консультант, BMW Dubai",
      },
      {
        quote:
          "Только предложения по допродажам окупили 6 месяцев подписки за первую неделю.",
        name: "Sarah R.",
        role: "Старший консультант, Toyota London",
      },
    ],
  },
} as const;

export type Translations = (typeof translations)[Lang];
