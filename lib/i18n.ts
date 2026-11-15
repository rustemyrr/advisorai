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
    heroDemo: "See how it works",
    heroNote: "From $4/month · No setup · Works on any device",
    exampleTitle: "Example output",
    exampleEstimate: "• Front brake discs (x2 OEM-spec): $320\n• Front brake pads (set): $95\n• Brake caliper service: $45\n• Front brake labour: $160\n• Crankshaft oil seal (part): $35\n• Crankshaft oil seal labour: $280\n• Fluids & shop supplies: $40\n\nTotal: $975 – $1,075",
    exampleExplanation: "We'll be replacing your front brake discs and pads, which are essential for safe stopping, and fixing a leaking crankshaft oil seal to prevent engine oil loss. Both jobs make good sense to do together since your car is already in the shop — saving you on labour time.",
    exampleUpsell: "At 180,000 miles, your coolant system components — particularly the water pump and thermostat — are very likely due for replacement. Replacing them now while the front of the engine is already partially accessed can save $320–$480 in labour later.",

    // DemoWidget
    defaultJob:
      "BMW 520d, 180k miles. Front brake discs + pads. Oil seal leaking on crank.",
    liveDemoLabel: "Live demo — try it now",
    liveDemoLabelLoggedIn: "Vehicle Analysis",
    liveDemoSubtitleLoggedIn: "Increase average ticket with every customer",
    generate: "Generate",
    usageLabel: (count: number, limit: number) =>
      `${count} of ${limit} generations used this month`,
    remaining: (n: number) => `${n} generation${n === 1 ? "" : "s"} remaining this month`,
    emailModalTitle: "🔓 Get 2 more free generations",
    emailModalSubtext: "No spam. Just your email to continue.",
    emailPlaceholder: "you@dealership.com",
    continueGenerating: "Continue generating →",
    upgradeNote: "Upgrade anytime for more access",
    limitTitle: "You've reached your monthly limit",
    limitSubtext:
      "Upgrade to Standard or Professional for more estimates, explanations, and upsell suggestions.",
    startTrial: "View plans →",
    signInToGenerate: "Sign in to generate →",
    pleaseWait: "Please wait…",
    pleaseEnterEmail: "Please enter your email",
    outputEstimate: "Estimate",
    outputExplanation: "Plain-language explanation",
    outputUpsell: "Upsell suggestion",
    generateErrorGeneric: "Could not generate a response. Please try again.",

    // Billing portal
    manageBilling: "Manage subscription",
    manageBillingOpening: "Opening\u2026",
    manageBillingError: "Could not open the billing portal. Please try again, or write to us.",

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
    pricingFreeNote:
      "Signing up is free and gives you 5 generations a month. The plans below raise that and add the pricelist and history features.",
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
      "Estimate history — last 7 days",
    ],
    standardFeatures: [
      "100 generations per month",
      "1 advisor",
      "Everything in Starter",
      "Estimate history — no time limit",
      "Pricelist upload (Excel/CSV)",
    ],
    professionalFeatures: [
      "Unlimited generations",
      "Everything in Standard",
      "Priority support",
    ],
    // Not built yet. Shown with a badge so nobody buys the plan expecting them
    // today — see the pricing audit from 2026-11-15.
    professionalSoon: ["Up to 3 advisor seats", "Team analytics / dashboard"],
    featureSoon: "in development",
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
          "Your job descriptions and the generated output are saved to your own estimate history so you can come back to them, and only you can read them. The job description is sent to Anthropic's API to produce the output. Nothing is sold or shared with anyone else, and you can ask us to delete your history at any time.",
      },
      {
        question: "Can I cancel anytime?",
        answer:
          "Yes — no contracts and no cancellation fees. Sign in and use the “Manage subscription” link: it opens Paddle’s customer portal, where you can cancel or change your card. Billing stops at the end of the period you have already paid for. You can also just write to us.",
      },
    ],

    // CTA Section
    ctaHeadline: "Start writing better estimates today.",
    // Said nothing about who already uses it: with four accounts and no paying
    // customers, "join advisors in the UAE, UK and US" was the same invention
    // as the testimonials this block used to sit under.
    ctaSubtext:
      "Works in KZT, RUB, USD, AED and GBP, on your own price list, from any device. Cancel whenever you like.",
    ctaButton: "See plans",
    ctaNote: "From $4/month · Cancel anytime",

    // Agents for pros
    navAgents: "Agents for pros",
    navAgentsShort: "Agents",
    agentsHeadline: "Agents for pros",
    agentsSubtitle: "The ones that make you more effective and make your life simpler",
    agentsSubtext:
      "Each agent takes over one job that eats your time every day and does it on its own — no reminders, and no new software to learn.",
    agentDirectorTitle: "AI assistant for the director",
    agentDirectorText:
      "Takes the evening spreadsheet work off your hands. Yesterday's summary is ready by morning: revenue, average ticket, costs, workload. Need a particular number? Ask in plain language and get an answer, not a form to fill in.",
    agentDirectorBullets: [
      "Yesterday's summary arrives in the morning — nothing to compile",
      "A question about the numbers in plain language instead of a report form",
      "Spots what went off on its own and says where to look first",
    ],
    agentSmmTitle: "AI SMM editor",
    agentSmmText:
      "Takes the editing and the captions off you. You film the job on a phone — the agent picks the usable takes, cuts the clip and writes the post. Keeping the socials going no longer costs you an evening.",
    agentSmmBullets: [
      "A finished Reel from ordinary phone video",
      "Captions and hooks you do not have to rewrite",
      "A week's content plan — no deciding what to post",
    ],
    agentsHowTag: "How we start",
    agentsHowText:
      "We start with a call: we look at how the work is done today, pick the one job worth handing over first, and agree on what the agent has to deliver. Setup takes a few days, and you keep access to everything the agent produces.",
    consultTitle: "Request a consultation",
    consultSubtext:
      "Leave your contact details and we will get in touch to discuss which agent fits your business.",
    consultName: "Name",
    consultNamePlaceholder: "How should we address you",
    consultContact: "Phone or email",
    consultContactPlaceholder: "+7 700 000 00 00 or you@company.com",
    consultComment: "Comment",
    consultCommentOptional: "optional",
    consultCommentPlaceholder:
      "Briefly: what you do and which job you would like to hand over",
    consultSubmit: "Send request",
    consultSending: "Sending…",
    consultSuccessTitle: "Request sent",
    consultSuccessText: "We will get in touch using the contact details you left.",
    consultErrorRequired: "Please fill in your name and a contact.",
    consultErrorTooMany:
      "You have already left a request today. We have it \u2014 we will be in touch.",
    consultErrorGeneric:
      "Could not send the request. Please try again or write to us directly.",

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

    // HowItWorks
    howTag: "How it works",
    howHeadline: "Three steps from the service desk to the customer's screen.",
    howSubtext:
      "Nothing to install and nothing to learn. You type the job the way you would say it out loud, and you get back something you can hand to the customer.",
    howSteps: [
      {
        title: "Load your price list once",
        text: "Upload the spreadsheet you already work from. Estimates come back with your own prices and labour hours, not market averages.",
      },
      {
        title: "Describe the job in your own words",
        text: "“BMW 520d, 180k, front discs and pads, oil seal leaking on the crank.” Shorthand is fine — that is how advisors write it down anyway.",
      },
      {
        title: "Hand over the estimate, the explanation and the upsell",
        text: "Three blocks come back together: the itemised quote, the same thing in plain language for the customer, and the job worth mentioning while the car is already on the lift.",
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
    heroDemo: "Смотреть как работает",
    heroNote: "От $4 в месяц · Без настройки · На любом устройстве",
    exampleTitle: "Пример результата",
    exampleEstimate: "• Тормозные диски передние (x2): 144 000 ₸\n• Тормозные колодки (комплект): 43 000 ₸\n• Обслуживание суппортов: 20 000 ₸\n• Работа по тормозам: 72 000 ₸\n• Сальник коленвала (деталь): 16 000 ₸\n• Замена сальника (работа): 126 000 ₸\n• Расходники и жидкости: 18 000 ₸\n\nИтого: 439 000 – 470 000 ₸",
    exampleExplanation: "Заменим передние тормозные диски и колодки — это необходимо для безопасного торможения. Заодно устраним течь сальника коленвала, чтобы двигатель не терял масло. Делать всё вместе выгоднее — экономим на работе.",
    exampleUpsell: "При пробеге 180 000 км высока вероятность износа водяного насоса и термостата. Замена сейчас, пока передняя часть двигателя уже разобрана, сэкономит 144 000–216 000 ₸ на работе в будущем.",

    // DemoWidget
    defaultJob:
      "BMW 520d, 180 тыс. км. Передние тормозные диски + колодки. Течь сальника коленвала.",
    liveDemoLabel: "Живое демо — попробуйте прямо сейчас",
    liveDemoLabelLoggedIn: "Анализ автомобиля",
    liveDemoSubtitleLoggedIn: "Увеличьте средний чек с каждого клиента",
    generate: "Создать",
    usageLabel: (count: number, limit: number) =>
      `Использовано ${count} из ${limit} генераций в этом месяце`,
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
    generateErrorGeneric: "Не удалось сгенерировать ответ. Попробуйте ещё раз.",

    // Billing portal
    manageBilling: "Управление подпиской",
    manageBillingOpening: "Открываем\u2026",
    manageBillingError: "Не удалось открыть портал оплаты. Попробуйте ещё раз или напишите нам.",

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
    pricingFreeNote:
      "Регистрация бесплатная и даёт 5 генераций в месяц. Планы ниже поднимают лимит и добавляют прайс-лист и историю смет.",
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
      "История смет — последние 7 дней",
    ],
    standardFeatures: [
      "100 генераций в месяц",
      "1 консультант",
      "Всё из Starter",
      "История смет без ограничения по сроку",
      "Загрузка прайс-листа (Excel/CSV)",
    ],
    professionalFeatures: [
      "Безлимитные генерации",
      "Всё из Standard",
      "Приоритетная поддержка",
    ],
    professionalSoon: ["До 3 мест для консультантов", "Аналитика команды / дашборд"],
    featureSoon: "в разработке",
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
          "Описания работ и результаты сохраняются в вашу историю смет, чтобы вы могли к ним вернуться; прочитать их можете только вы. Описание работы отправляется в API Anthropic, который и формирует результат. Больше никому данные не передаются и не продаются, а историю мы удалим по вашей просьбе.",
      },
      {
        question: "Можно ли отменить в любое время?",
        answer:
          "Да — без контрактов и штрафов. Войдите и нажмите «Управление подпиской»: откроется портал Paddle, где можно отменить подписку или поменять карту. Списания прекратятся в конце уже оплаченного периода. Можно и просто написать нам.",
      },
    ],

    // CTA Section
    ctaHeadline: "Начните составлять сметы лучше уже сегодня.",
    ctaSubtext:
      "Работает в тенге, рублях, долларах, дирхамах и фунтах, по вашему прайс-листу и с любого устройства. Отменить можно в любой момент.",
    ctaButton: "Смотреть планы",
    ctaNote: "От $4 в месяц · Отмена в любое время",

    // Agents for pros
    navAgents: "Агенты для профессионалов",
    navAgentsShort: "Агенты",
    agentsHeadline: "Агенты для профессионалов",
    agentsSubtitle: "Те, кто делает вас эффективнее и упрощает вашу жизнь",
    agentsSubtext:
      "Каждый агент берёт на себя одну задачу, на которую у вас каждый день уходит время, и делает её сам — без напоминаний и без новых программ, которые надо осваивать.",
    agentDirectorTitle: "ИИ ассистент директора",
    agentDirectorText:
      "Избавляет от вечернего сведения таблиц. Утром отчёт за вчера уже готов: выручка, средний чек, расходы, загрузка. А если нужно уточнить цифру — спрашиваете обычным языком и получаете ответ, а не форму для заполнения.",
    agentDirectorBullets: [
      "Отчёт за вчера приходит утром — сводить ничего не нужно",
      "Вопрос о цифрах обычным языком вместо отчётной формы",
      "Сам замечает, что пошло не так, и говорит, куда смотреть в первую очередь",
    ],
    agentSmmTitle: "ИИ СММ-монтажёр",
    agentSmmText:
      "Снимает с вас монтаж и подписи. Вы просто снимаете работу на телефон — агент отбирает удачные кадры, собирает ролик и пишет текст к публикации. Вести соцсети больше не значит тратить на это вечер.",
    agentSmmBullets: [
      "Готовый Reels из обычного видео со смартфона",
      "Подписи и заголовки, которые не надо переписывать",
      "Контент-план на неделю — не нужно придумывать, что выкладывать",
    ],
    agentsHowTag: "С чего начинаем",
    agentsHowText:
      "Начинаем с созвона: смотрим, как работа устроена сейчас, выбираем одну задачу, которую стоит отдать первой, и договариваемся о результате. Настройка занимает несколько дней, доступ ко всему, что делает агент, остаётся у вас.",
    consultTitle: "Заявка на консультацию",
    consultSubtext:
      "Оставьте контакты — свяжемся и обсудим, какой агент подойдёт вашему бизнесу.",
    consultName: "Имя",
    consultNamePlaceholder: "Как к вам обращаться",
    consultContact: "Телефон или email",
    consultContactPlaceholder: "+7 700 000 00 00 или you@company.com",
    consultComment: "Комментарий",
    consultCommentOptional: "необязательно",
    consultCommentPlaceholder:
      "Коротко: чем занимаетесь и какую задачу хотели бы отдать",
    consultSubmit: "Отправить заявку",
    consultSending: "Отправляем…",
    consultSuccessTitle: "Заявка отправлена",
    consultSuccessText: "Свяжемся с вами по оставленным контактам.",
    consultErrorRequired: "Заполните имя и контакт.",
    consultErrorTooMany:
      "Вы уже оставляли заявку сегодня. Она у нас — мы свяжемся с вами.",
    consultErrorGeneric:
      "Не удалось отправить заявку. Попробуйте ещё раз или напишите нам напрямую.",

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

    // HowItWorks
    howTag: "Как это работает",
    howHeadline: "Три шага от стойки приёмки до экрана клиента.",
    howSubtext:
      "Ничего не нужно устанавливать и нечему учиться. Вы описываете работу так, как сказали бы её вслух, и получаете то, что можно сразу отдать клиенту.",
    howSteps: [
      {
        title: "Один раз загрузите прайс-лист",
        text: "Тот же файл, с которым вы уже работаете. Сметы считаются по вашим ценам и нормо-часам, а не по средним по рынку.",
      },
      {
        title: "Опишите работу своими словами",
        text: "«BMW 520d, 180 тыс., передние диски и колодки, течёт сальник коленвала». Сокращения не мешают — приёмщики так и записывают.",
      },
      {
        title: "Отдайте смету, объяснение и допродажу",
        text: "Возвращаются сразу три блока: смета по позициям, то же самое простым языком для клиента и работа, о которой стоит сказать, пока машина уже на подъёмнике.",
      },
    ],
  },
} as const;

export type Translations = (typeof translations)[Lang];
