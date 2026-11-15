/**
 * Picks the data provider for the current deployment, once per process.
 *
 * Which one is in use changes nothing above this line: the prompt, the tools
 * and the reminder job only ever see a ServiceDataProvider.
 */

import { providerMode } from "../config";
import type { ServiceDataProvider } from "../provider";
import { CrmServiceProvider } from "./crm-provider";
import { Odata1cServiceProvider } from "./odata-1c-provider";
import { SupabaseServiceProvider } from "./supabase-provider";

let cached: ServiceDataProvider | null = null;

export function getProvider(): ServiceDataProvider {
  if (cached) return cached;

  switch (providerMode()) {
    case "crm":
      cached = new CrmServiceProvider();
      break;
    case "odata-1c":
      cached = new Odata1cServiceProvider();
      break;
    default:
      cached = new SupabaseServiceProvider();
  }

  console.log(`[service-agent] data provider: ${cached.mode}`);
  return cached;
}

/** For tests and for a route that needs to force a mode. */
export function setProvider(provider: ServiceDataProvider | null): void {
  cached = provider;
}
