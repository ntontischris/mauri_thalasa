export type SmsResult =
  | { ok: true; message_id?: string }
  | { ok: false; reason: string };

function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("30") && digits.length >= 12) return `+${digits}`;
  if (digits.startsWith("69") && digits.length === 10) return `+30${digits}`;
  return `+${digits}`;
}

async function sendTwilio(phone: string, message: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM_NUMBER;
  if (!sid || !token || !from) return { ok: false, reason: "Twilio credentials missing" };
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const body = new URLSearchParams({ To: phone, From: from, Body: message });
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, reason: `Twilio ${res.status}: ${text.slice(0, 200)}` };
  }
  const data = (await res.json()) as { sid?: string };
  return { ok: true, message_id: data.sid };
}

async function sendGeneric(phone: string, message: string): Promise<SmsResult> {
  const url = process.env.SMS_WEBHOOK_URL;
  if (!url) return { ok: false, reason: "SMS_WEBHOOK_URL missing" };
  const auth = process.env.SMS_WEBHOOK_AUTH;
  const from = process.env.SMS_SENDER_ID ?? "POS";
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
    body: JSON.stringify({ phone, message, from }),
  });
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, reason: `Webhook ${res.status}: ${text.slice(0, 200)}` };
  }
  return { ok: true };
}

export async function sendSms(phoneRaw: string, message: string): Promise<SmsResult> {
  const provider = (process.env.SMS_PROVIDER ?? "").toLowerCase();
  if (!provider || provider === "null") return { ok: false, reason: "disabled" };
  if (!phoneRaw || !message) return { ok: false, reason: "phone or message empty" };
  const phone = normalizePhone(phoneRaw);
  try {
    if (provider === "twilio") return await sendTwilio(phone, message);
    if (provider === "generic") return await sendGeneric(phone, message);
    return { ok: false, reason: `Unknown provider: ${provider}` };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export async function sendBulkSms(
  recipients: Array<{ phone: string; message: string }>,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const result = { sent: 0, failed: 0, errors: [] as string[] };
  for (const r of recipients) {
    const out = await sendSms(r.phone, r.message);
    if (out.ok) result.sent += 1;
    else {
      result.failed += 1;
      if (result.errors.length < 5) result.errors.push(`${r.phone}: ${out.reason}`);
    }
  }
  return result;
}

export function smsEnabled(): boolean {
  const p = (process.env.SMS_PROVIDER ?? "").toLowerCase();
  return p === "twilio" || p === "generic";
}
