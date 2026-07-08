import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const divisions = await prisma.division.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json(divisions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const division = await prisma.division.create({ data: body });
  return NextResponse.json(division, { status: 201 });
}
