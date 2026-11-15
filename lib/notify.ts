/**
 * Telegram notification for a new consultation request.
 *
 * Until this existed, a request landed in the consultation_requests table and
 * nobody was told: no mail, no message, no page listing them. The domain has no
 * MX records either, so a bot is the cheapest channel that actually works.
 *
 * Both env vars are optional. With either one missing this is a no-op, so the
 * form keeps working on a local checkout and on a deployment that has not been
 * given a bot yet.
 *
 *   TELEGRAM_BOT_TOKEN  from @BotFather
 *   TELEGRAM_CHAT_ID    your own chat with the bot, or a group it is in
 */

const TELEGRAM_TIMEOUT_MS = 4000;

export type ConsultationLead = {
  name: string;
  contact: string;
  comment: string | null;
  source: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Sends one message to the shop chat. Empty lines are dropped, so a caller can
 * build the message with conditional lines and not worry about blanks.
 *
 * Returns false when there is no bot configured or the send failed — a caller
 * that needs to know whether a person was actually told (the service agent
 * does, when a reminder could not be placed as a call) can act on that.
 */
export async function sendTelegramMessage(lines: string[]): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return false;

  const text = lines.filter((line) => line && line.trim()).join("\n");
  if (!text) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("[notify] telegram replied", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[notify] telegram request failed:", err);
    return false;
  }
}

export async function notifyNewConsultation(lead: ConsultationLead): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const lines = [
    "<b>Новая заявка на консультацию</b>",
    `Имя: ${escapeHtml(lead.name)}`,
    `Контакт: ${escapeHtml(lead.contact)}`,
  ];
  if (lead.comment) lines.push(`Комментарий: ${escapeHtml(lead.comment)}`);
  lines.push(`Источник: ${escapeHtml(lead.source)}`);

  // The lead is already saved by the time we get here, so a failed or slow
  // notification must never turn into a failed submission.
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join("\n"),
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("[notify] telegram replied", res.status, await res.text());
    }
  } catch (err) {
    console.error("[notify] telegram request failed:", err);
  }
}
