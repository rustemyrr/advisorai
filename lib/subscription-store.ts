export type SubscriptionStatus = "active" | "canceled";

export type SubscriptionRecord = {
  paddleSubscriptionId: string;
  customerId: string;
  status: SubscriptionStatus;
  email?: string;
  priceId?: string;
  updatedAt: string;
};

const store = new Map<string, SubscriptionRecord>();

export async function upsertSubscription(
  record: Omit<SubscriptionRecord, "updatedAt"> & { status: SubscriptionStatus }
) {
  store.set(record.paddleSubscriptionId, {
    ...record,
    updatedAt: new Date().toISOString(),
  });
  console.info("[paddle] subscription updated:", record.paddleSubscriptionId, record.status);
}

export async function getSubscription(paddleSubscriptionId: string) {
  return store.get(paddleSubscriptionId);
}
