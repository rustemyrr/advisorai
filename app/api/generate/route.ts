import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getUserFromToken, createAdminClient } from "@/lib/supabase-server";
import { getClientIp } from "@/lib/get-client-ip";
import { releaseForIp, reserveForIp } from "@/lib/leads-store";
import {
  getMonthString,
  getOrCreateProfile,
  limitForPlan,
  releaseGeneration,
  reserveGeneration,
} from "@/lib/usage";
import type { PricelistItem } from "@/app/api/pricelist/route";

function buildPricelistSection(items: PricelistItem[], laborRate: number, currency: string): string {
  const rows = items
    .map((i) => `  - ${i.service}: ${i.price} ${currency}, ${i.hours}h`)
    .join("\n");
  return `Use the following dealership price list for your estimates:\n${rows}\nLabor rate: ${laborRate} ${currency} per hour.`;
}

function buildSystemPrompt(
  language: string,
  currency: string,
  pricelist?: { items: PricelistItem[]; labor_rate: number } | null
): string {
  const currencyInstruction = `Always show prices in ${currency}. Use realistic local market prices for that currency.`;
  const pricelistSection = pricelist && pricelist.items.length > 0
    ? "\n" + buildPricelistSection(pricelist.items, pricelist.labor_rate, currency)
    : "";

  if (language === "ru") {
    return `Ты — ИИ-ассистент для автомобильных сервисных консультантов. По описанию ремонтной работы верни JSON-объект ровно с тремя полями:
estimate: список позиций сметы (запчасти + работа), профессионально и чётко, на русском языке
explanation: объяснение простым языком для нетехнического клиента, 2-3 предложения, дружелюбный тон, на русском языке
upsell: одно конкретное предложение допуслуги, актуальное для пробега и типа работы, с диапазоном цен, на русском языке
${currencyInstruction}${pricelistSection}
Верни только валидный JSON, без markdown, без лишнего текста.`;
  }

  return `You are an AI assistant for automotive service advisors. Given a repair job description, return a JSON object with exactly these three fields:
estimate: a bullet-point list of repair line items (parts + labor), professional and clear
explanation: a plain-language explanation for a non-technical customer, 2-3 sentences, friendly tone
upsell: one specific upsell suggestion relevant to the mileage and job type, with a price range
${currencyInstruction}${pricelistSection}
Return only valid JSON, no markdown, no extra text.`;
}

async function fetchPricelistForUser(userId: string) {
  const db = createAdminClient();
  const { data } = await db
    .from("pricelist")
    .select("items, labor_rate")
    .eq("user_id", userId)
    .single();
  return data as { items: PricelistItem[]; labor_rate: number } | null;
}

function parseJsonResponse(text: string) {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Invalid response format");
  }
  return JSON.parse(jsonMatch[0]) as {
    estimate: string;
    explanation: string;
    upsell: string;
  };
}

// A repair job description is a couple of sentences. Anything longer is a
// mistake or an attempt to run up the Anthropic bill on someone else's key.
const MAX_JOB_DESCRIPTION_LENGTH = 2000;

export async function POST(request: Request) {
  try {
    const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? null;
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const { jobDescription, language, currency } = body;

    if (!jobDescription || typeof jobDescription !== "string") {
      return NextResponse.json(
        { error: "jobDescription is required" },
        { status: 400 }
      );
    }

    if (jobDescription.length > MAX_JOB_DESCRIPTION_LENGTH) {
      return NextResponse.json(
        {
          error: `jobDescription must be at most ${MAX_JOB_DESCRIPTION_LENGTH} characters`,
        },
        { status: 400 }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const user = token ? await getUserFromToken(token) : null;

    let pricelist: { items: PricelistItem[]; labor_rate: number } | null = null;
    // Set once a generation has been spent, and called only if the model never
    // answers -- see the call below.
    let release: (() => Promise<void>) | null = null;

    // The allowance is spent before the model is asked anything, not after it
    // replies. Checking first and writing afterwards is two statements with a
    // gap in the middle: two requests that arrive together both pass the check
    // and the limit is quietly exceeded.
    if (user) {
      const month = getMonthString();
      const profile = await getOrCreateProfile(user.id);
      const limit = limitForPlan(profile.plan);
      pricelist = await fetchPricelistForUser(user.id);

      if (limit !== Infinity) {
        const reservation = await reserveGeneration(user.id, month, limit);
        if (!reservation.counted) {
          return NextResponse.json(
            { error: "Monthly generation limit reached for your plan", code: "USAGE_LIMIT" },
            { status: 402 }
          );
        }
        release = () => releaseGeneration(user.id, month);
      }
    } else {
      const ip = getClientIp(request);
      const reservation = await reserveForIp(ip);
      if (!reservation.counted) {
        return NextResponse.json(
          { error: "Free generation limit reached", code: "USAGE_LIMIT" },
          { status: 402 }
        );
      }
      release = () => releaseForIp(ip);
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const systemPrompt = buildSystemPrompt(
      language ?? "en",
      currency ?? (language === "ru" ? "KZT (₸)" : "USD ($)"),
      pricelist
    );

    // Whatever happens from here on, the generation stays spent: by the time
    // the model has answered the key is paid for, and a reply that fails to
    // parse must not be free -- the job description is the visitor's own
    // prompt, so "answer in plain text, no JSON" is a reply they can ask for
    // on purpose and repeat.
    //
    // A call that never answers at all is the one exception. Nothing was
    // billed, and nothing in a repair description can provoke it, so that
    // generation goes back.
    const message = await client.messages
      .create({
        model: "claude-sonnet-5-5",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: jobDescription }],
      })
      .catch(async (modelError: unknown) => {
        if (release) await release();
        throw modelError;
      });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from model" },
        { status: 500 }
      );
    }

    const parsed = parseJsonResponse(textBlock.text);

    return NextResponse.json(parsed);
  } catch (err) {
    // The detail belongs in the log, not in the response: it is a database or
    // model error and it describes our schema and our driver to a stranger.
    console.error("[generate]", err);
    return NextResponse.json(
      { error: "Could not generate a response. Please try again.", code: "GENERATE_FAILED" },
      { status: 500 }
    );
  }
}
