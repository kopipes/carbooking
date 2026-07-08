import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  if (body.password) body.password = await bcrypt.hash(body.password, 10);
  if (body.divisionId) body.divisionId = parseInt(body.divisionId);
  const user = await prisma.user.update({
    where: { id: parseInt(id) },
    data: body,
    include: { division: { select: { name: true } } },
    omit: { password: true },
  });
  return NextResponse.json(user);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.user.update({ where: { id: parseInt(id) }, data: { active: false } });
  return NextResponse.json({ success: true });
}
