import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { checkUsage, checkUsageForIp, incrementUsageForIp } from "@/lib/leads-store";
import { getClientIp } from "@/lib/get-client-ip";

const SYSTEM_PROMPT = `You are an AI assistant for automotive service advisors. Given a repair job description, return a JSON object with exactly these three fields:
estimate: a bullet-point list of repair line items (parts + labor), professional and clear
explanation: a plain-language explanation for a non-technical customer, 2-3 sentences, friendly tone
upsell: one specific upsell suggestion relevant to the mileage and job type, with a price range in GBP
Return only valid JSON, no markdown, no extra text.`;

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
    const ip = getClientIp(request);
    const usage = await checkUsageForIp(ip);

    if (!usage.allowed) {
      if (usage.requiresEmail) {
        return NextResponse.json(
          { error: "Email required", code: "EMAIL_REQUIRED", ...usage },
          { status: 403 }
        );
      }
      return NextResponse.json(
        {
          error: "You've used all 3 free generations. Upgrade to Pro for unlimited access.",
          code: "LIMIT_REACHED",
          ...usage,
        },
        { status: 403 }
      );
    }

    const { jobDescription } = await request.json();

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

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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
    const record = await incrementUsageForIp(ip);

    return NextResponse.json({
      ...parsed,
      usage: checkUsage(record),
    });
  } catch (err) {
    console.error(err);
    const message =
      err instanceof Error ? err.message : "Failed to generate response";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
