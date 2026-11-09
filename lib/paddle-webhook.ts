import crypto from "crypto";

/** Paddle signs the timestamp together with the body; without a freshness
 *  window a captured request stays replayable for as long as the secret lives. */
const MAX_SIGNATURE_AGE_SECONDS = 5 * 60;

/**
 * Verifies Paddle Billing webhook signatures.
 * @see https://developer.paddle.com/webhooks/signature-verification
 */
export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): boolean {
  const parts = signatureHeader.split(";").reduce<Record<string, string>>(
    (acc, part) => {
      const [key, value] = part.split("=");
      if (key && value) acc[key.trim()] = value.trim();
      return acc;
    },
    {}
  );

  const timestamp = parts.ts;
  const receivedHash = parts.h1;

  if (!timestamp || !receivedHash) {
    return false;
  }

  const timestampSeconds = Number(timestamp);
  if (
    !Number.isFinite(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > MAX_SIGNATURE_AGE_SECONDS
  ) {
    return false;
  }

  const payload = `${timestamp}:${rawBody}`;
  const expectedHash = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedHash),
      Buffer.from(expectedHash)
    );
  } catch {
    return false;
  }
}
