/**
 * Creates AdvisorAI product + $29/month Pro price in Paddle sandbox.
 *
 * Usage:
 *   PADDLE_API_KEY=pdl_sdbx_apikey_... node scripts/create-paddle-catalog.mjs
 *
 * Copy the printed NEXT_PUBLIC_PADDLE_PRICE_ID into .env.local
 */

const API_KEY = process.env.PADDLE_API_KEY;
const BASE_URL = "https://sandbox-api.paddle.com";

if (!API_KEY) {
  console.error("Set PADDLE_API_KEY to your Paddle sandbox API key.");
  process.exit(1);
}

async function paddleRequest(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(JSON.stringify(json, null, 2));
  }
  return json.data;
}

async function main() {
  console.log("Creating AdvisorAI product in Paddle sandbox...");

  const product = await paddleRequest("/products", {
    name: "AdvisorAI",
    tax_category: "standard",
    description: "AI-powered estimates and upsells for automotive service advisors",
  });

  console.log("Product created:", product.id);

  const price = await paddleRequest("/prices", {
    description: "AdvisorAI Pro — monthly subscription",
    name: "AdvisorAI Pro",
    product_id: product.id,
    unit_price: {
      amount: "2900",
      currency_code: "USD",
    },
    billing_cycle: {
      interval: "month",
      frequency: 1,
    },
    trial_period: {
      interval: "day",
      frequency: 7,
    },
    tax_mode: "account_setting",
  });

  console.log("\nSuccess! Add to .env.local:\n");
  console.log(`NEXT_PUBLIC_PADDLE_PRICE_ID=${price.id}`);
  console.log("\nPrice:", price.name, "— $29/month with 7-day trial");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
