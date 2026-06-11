import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT_EN = `You are an AI assistant for automotive service advisors. Given a repair job description, return a JSON object with exactly these three fields:
estimate: a bullet-point list of repair line items (parts + labor), professional and clear
explanation: a plain-language explanation for a non-technical customer, 2-3 sentences, friendly tone
upsell: one specific upsell suggestion relevant to the mileage and job type, with a price range in GBP
Return only valid JSON, no markdown, no extra text.`;

const SYSTEM_PROMPT_RU = `Ты — ИИ-ассистент для автомобильных сервисных консультантов. По описанию ремонтной работы верни JSON-объект ровно с тремя полями:
estimate: список позиций сметы (запчасти + работа), профессионально и чётко, на русском языке
explanation: объяснение простым языком для нетехнического клиента, 2-3 предложения, дружелюбный тон, на русском языке
upsell: одно конкретное предложение допуслуги, актуальное для пробега и типа работы, с диапазоном цен в рублях, на русском языке
Верни только валидный JSON, без markdown, без лишнего текста.`;

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
    const { jobDescription, language } = await request.json();

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

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const systemPrompt = language === "ru" ? SYSTEM_PROMPT_RU : SYSTEM_PROMPT_EN;

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
    return NextResponse.json(parsed);
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : "Failed to generate response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
