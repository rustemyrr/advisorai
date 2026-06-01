import { promises as fs } from "fs";
import path from "path";

export type SubscriptionStatus = "active" | "canceled";

export type SubscriptionRecord = {
  paddleSubscriptionId: string;
  customerId: string;
  status: SubscriptionStatus;
  email?: string;
  priceId?: string;
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data");
const STORE_PATH = path.join(DATA_DIR, "subscriptions.json");

async function readStore(): Promise<Record<string, SubscriptionRecord>> {
  try {
    const raw = await fs.readFile(STORE_PATH, "utf8");
    return JSON.parse(raw) as Record<string, SubscriptionRecord>;
  } catch {
    return {};
  }
}

async function writeStore(data: Record<string, SubscriptionRecord>) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(STORE_PATH, JSON.stringify(data, null, 2), "utf8");
}

export async function upsertSubscription(
  record: Omit<SubscriptionRecord, "updatedAt"> & { status: SubscriptionStatus }
) {
  const store = await readStore();
  store[record.paddleSubscriptionId] = {
    ...record,
    updatedAt: new Date().toISOString(),
  };
  await writeStore(store);
  console.info("[paddle] subscription updated:", record.paddleSubscriptionId, record.status);
}

export async function getSubscription(paddleSubscriptionId: string) {
  const store = await readStore();
  return store[paddleSubscriptionId];
}
