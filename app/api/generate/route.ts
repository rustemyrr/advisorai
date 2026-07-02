import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getUserFromToken, createAdminClient } from "@/lib/supabase-server";
import { getClientIp } from "@/lib/get-client-ip";
import { checkUsageForIp, incrementUsageForIp } from "@/lib/leads-store";
import {
  getMonthString,
  getOrCreateProfile,
  getOrCreateUsage,
  incrementUsage,
  limitForPlan,
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

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 }
      );
    }

    const user = token ? await getUserFromToken(token) : null;

    let pricelist: { items: PricelistItem[]; labor_rate: number } | null = null;
    let recordUsage: () => Promise<void>;

    if (user) {
      const month = getMonthString();
      const [usage, profile] = await Promise.all([
        getOrCreateUsage(user.id, month),
        getOrCreateProfile(user.id),
      ]);
      const limit = limitForPlan(profile.plan);
      if (usage.count >= limit) {
        return NextResponse.json(
          { error: "Monthly generation limit reached for your plan", code: "USAGE_LIMIT" },
          { status: 402 }
        );
      }
      pricelist = await fetchPricelistForUser(user.id);
      recordUsage = async () => {
        if (limit !== Infinity) await incrementUsage(user.id, month, usage.count + 1);
      };
    } else {
      const ip = getClientIp(request);
      const status = await checkUsageForIp(ip);
      if (!status.allowed) {
        return NextResponse.json(
          { error: "Free generation limit reached", code: "USAGE_LIMIT" },
          { status: 402 }
        );
      }
      recordUsage = async () => {
        await incrementUsageForIp(ip);
      };
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const systemPrompt = buildSystemPrompt(
      language ?? "en",
      currency ?? (language === "ru" ? "KZT (₸)" : "USD ($)"),
      pricelist
    );

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: "user", content: jobDescription }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json(
        { error: "No text response from model" },
        { status: 500 }
      );
    }

    const parsed = parseJsonResponse(textBlock.text);

    await recordUsage();

    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : "Failed to generate response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
