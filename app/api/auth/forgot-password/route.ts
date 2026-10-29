import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import crypto from "crypto";
import { notifyRecipients, type NotificationSummary } from "@/lib/notiv";
import { recordNotificationResults } from "@/lib/notification-log";

const resend = new Resend(process.env.RESEND_API_KEY);

function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL ??
    process.env.AUTH_URL ??
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

function emailHtml(name: string, resetUrl: string): string {
  return `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">Reset Password</h2>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">
          Hai <strong>${name}</strong>, kami menerima permintaan reset password untuk akun kamu.
          Klik tombol di bawah untuk membuat password baru. Link ini berlaku selama <strong>1 jam</strong>.
        </p>
        <a href="${resetUrl}"
          style="display: inline-block; background: #2563eb; color: #fff; font-size: 14px;
                 font-weight: 600; padding: 12px 24px; border-radius: 8px; text-decoration: none;">
          Reset Password
        </a>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
          Kalau kamu tidak meminta reset password, abaikan email ini. Password kamu tidak akan berubah.
        </p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #cbd5e1; font-size: 11px;">Booking &mdash; Office Booking System</p>
      </div>
    `;
}

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email wajib diisi" }, { status: 400 });
  }

  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ success: true });
  }

  // Delete existing tokens for this email
  await prisma.passwordResetToken.deleteMany({ where: { email } });

  // Generate token — 32 random bytes = 64 hex chars
  const token     = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { token, email, expiresAt },
  });

  const resetUrl = `${appBaseUrl()}/reset-password?token=${token}`;

  // Primary channel: Notiv inbox. The token is sensitive, so the message is
  // marked sensitive (hidden from other admins and push previews) and expires
  // together with the token.
  const notiv = await notifyRecipients([{ email }], () => ({
    type: "password_reset",
    title: "Reset Password — Booking",
    message: [
      `Hai ${user.name}, kami menerima permintaan reset password untuk akun kamu.`,
      `Buka tautan berikut untuk membuat password baru (berlaku 1 jam):`,
      resetUrl,
      ``,
      `Kalau kamu tidak meminta reset password, abaikan pesan ini. Password kamu tidak akan berubah.`,
    ].join("\n"),
    action_url: resetUrl,
    sensitive: true,
    expires_at: expiresAt.toISOString(),
    idempotency_key: `password-reset-${token}`,
  }));

  // Fallback: if Notiv cannot deliver (e.g. recipient not verified/connected),
  // still send the link by email so the user is not locked out.
  let emailResult: { ok: boolean; error?: string } | null = null;
  if (notiv.failed > 0) {
    try {
      const res = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL ?? "no-reply@provaliantgroup.com",
        to:   email,
        subject: "Reset Password — Booking",
        html: emailHtml(user.name, resetUrl),
      });
      emailResult = res.error
        ? { ok: false, error: res.error.message }
        : { ok: true };
    } catch (err) {
      emailResult = { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // Record both attempts so admins can see what happened.
  const results = [...notiv.results];
  if (emailResult) {
    results.push({
      email,
      ok: emailResult.ok,
      status: null,
      error: emailResult.ok
        ? "Notiv gagal — terkirim via email (fallback)"
        : `Notiv gagal dan email gagal: ${emailResult.error ?? "unknown"}`,
    });
  }
  const summary: NotificationSummary = {
    sent: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    failures: results.filter(r => !r.ok).map(r => ({ email: r.email, error: r.error ?? "Unknown error" })),
    results,
  };
  await recordNotificationResults({
    type: "password_reset",
    action: "requested",
    bookingId: null,
    notification: summary,
  });

  return NextResponse.json({ success: true });
}
