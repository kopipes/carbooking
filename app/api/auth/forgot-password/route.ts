import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import crypto from "crypto";

const resend = new Resend(process.env.RESEND_API_KEY);

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

  const baseUrl  = process.env.AUTH_URL ?? "http://localhost:3000";
  const resetUrl = `${baseUrl}/reset-password?token=${token}`;

  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "no-reply@provaliantgroup.com",
    to:   email,
    subject: "Reset Password — Booking",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h2 style="font-size: 20px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">Reset Password</h2>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 24px;">
          Hai <strong>${user.name}</strong>, kami menerima permintaan reset password untuk akun kamu.
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
    `,
  });

  return NextResponse.json({ success: true });
}
