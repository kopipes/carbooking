import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { token, password } = await req.json();

  if (!token || !password) {
    return NextResponse.json({ error: "Token dan password wajib diisi" }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password minimal 8 karakter" }, { status: 400 });
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!resetToken) {
    return NextResponse.json({ error: "Link reset tidak valid" }, { status: 400 });
  }
  if (resetToken.expiresAt < new Date()) {
    await prisma.passwordResetToken.delete({ where: { token } });
    return NextResponse.json({ error: "Link reset sudah kadaluarsa. Minta ulang reset password." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: resetToken.email } });
  if (!user) {
    return NextResponse.json({ error: "User tidak ditemukan" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data:  { password: hashed },
  });

  // Delete used token
  await prisma.passwordResetToken.delete({ where: { token } });

  return NextResponse.json({ success: true });
}
