import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const drivers = await prisma.driver.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json(drivers);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { name, phone, license } = body;
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const driver = await prisma.driver.create({ data: { name, phone, license } });
  return NextResponse.json(driver, { status: 201 });
}
