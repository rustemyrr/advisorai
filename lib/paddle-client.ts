import type { PaddlePublicConfig } from "./paddle-public-config";

/** Clear pointer-events locks left by payment overlays / strict-mode double mount. */
export function unlockPagePointerEvents() {
  if (typeof document === "undefined") return;
  document.body.style.pointerEvents = "";
  document.body.style.removeProperty("pointer-events");
  document.documentElement.style.pointerEvents = "";
  document.documentElement.style.removeProperty("pointer-events");
}

export function isConfigReady(config: PaddlePublicConfig): boolean {
  return Boolean(config.clientToken && config.priceId);
}
