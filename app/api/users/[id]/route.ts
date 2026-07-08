import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body   = await req.json();

  // Whitelist allowed fields — prevent mass-assignment
  const { name, email, password, role, phone, divisionId, active } = body;
  const data: any = {};
  if (name       !== undefined) data.name       = name;
  if (email      !== undefined) data.email      = email;
  if (phone      !== undefined) data.phone      = phone;
  if (active     !== undefined) data.active     = active;
  if (divisionId !== undefined) data.divisionId = parseInt(divisionId);
  if (role       !== undefined) {
    if (!["ADMIN", "MANAGER", "USER"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    data.role = role;
  }
  if (password) data.password = await bcrypt.hash(password, 10);

  const user = await prisma.user.update({
    where: { id: parseInt(id) },
    data,
    include: { division: { select: { name: true } } },
    omit: { password: true },
  });
  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.user.update({ where: { id: parseInt(id) }, data: { active: false } });
  return NextResponse.json({ success: true });
}
