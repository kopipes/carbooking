import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
    include: { division: { select: { name: true, code: true } } },
    omit: { password: true },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { name, email, password, role, phone, divisionId } = body;
  if (!name || !email || !password || !divisionId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role: role ?? "USER", phone, divisionId: parseInt(divisionId) },
    include: { division: { select: { name: true, code: true } } },
    omit: { password: true },
  });
  return NextResponse.json(user, { status: 201 });
}
