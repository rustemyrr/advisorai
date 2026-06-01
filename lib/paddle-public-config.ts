export type PaddlePublicConfig = {
  clientToken: string;
  priceId: string;
  environment: "sandbox" | "production";
};

function normalizeEnv(value: string | undefined): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function resolveEnvironment(token: string): "sandbox" | "production" {
  if (token.startsWith("test_")) return "sandbox";
  if (token.startsWith("live_")) return "production";

  const sandboxFlag =
    process.env.NEXT_PUBLIC_PADDLE_SANDBOX !== "false" &&
    process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT !== "production";

  return sandboxFlag ? "sandbox" : "production";
}

/** Read Paddle checkout config on the server (reliable .env.local access). */
export function getPaddlePublicConfig(): PaddlePublicConfig {
  const clientToken = normalizeEnv(
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ||
      process.env.PADDLE_CLIENT_TOKEN
  );
  const priceId = normalizeEnv(
    process.env.NEXT_PUBLIC_PADDLE_PRICE_ID || process.env.PADDLE_PRICE_ID
  );

  return {
    clientToken,
    priceId,
    environment: resolveEnvironment(clientToken),
  };
}

