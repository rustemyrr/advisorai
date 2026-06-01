import type { PaddlePublicConfig } from "./paddle-public-config";

export function isPaddleCheckoutConfigured(config: PaddlePublicConfig): boolean {
  return Boolean(config.clientToken && config.priceId);
}
