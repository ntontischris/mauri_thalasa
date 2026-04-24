import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendBulkSms, smsEnabled } from "@/lib/sms/provider";

export const dynamic = "force-dynamic";

const schema = z.object({
  recipients: z
    .array(
      z.object({
        id: z.string().uuid(),
        phone: z.string().min(5),
      }),
    )
    .min(1)
    .max(500),
  message: z.string().min(5).max(320),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.errors[0].message },
      { status: 400 },
    );
  }

  if (!smsEnabled()) {
    return NextResponse.json({
      ok: true,
      sent: 0,
      failed: parsed.data.recipients.length,
      errors: ["SMS_PROVIDER not configured"],
      dry_run: true,
    });
  }

  const result = await sendBulkSms(
    parsed.data.recipients.map((r) => ({
      phone: r.phone,
      message: parsed.data.message,
    })),
  );

  return NextResponse.json({
    ok: true,
    sent: result.sent,
    failed: result.failed,
    errors: result.errors,
  });
}
