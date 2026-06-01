import crypto from "crypto";

/**
 * Verifies Paddle Billing webhook signatures.
 * @see https://developer.paddle.com/webhooks/signature-verification
 */
export function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
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
