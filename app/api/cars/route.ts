import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { wibToUTC } from "@/lib/wib";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const where: any = { status: "AVAILABLE" };
  const date      = searchParams.get("date");
  const startTime = searchParams.get("startTime");
  const endTime   = searchParams.get("endTime");

  if (date && startTime && endTime) {
    const start = startTime.length <= 5 ? wibToUTC(date, startTime) : new Date(startTime);
    const end   = endTime.length   <= 5 ? wibToUTC(date, endTime)   : new Date(endTime);
    const busyCars = await prisma.booking.findMany({
      where: { OR: [{ startTime: { lt: end }, endTime: { gt: start } }] },
      select: { carId: true },
    });
    const busyCarIds = busyCars.map(b => b.carId);
    if (busyCarIds.length > 0) where.id = { notIn: busyCarIds };
  }

  const cars = await prisma.car.findMany({ where, orderBy: { name: "asc" } });
  return NextResponse.json(cars);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { name, plate, type, capacity, status } = body;
  if (!name || !plate || !type) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  const car = await prisma.car.create({ data: { name, plate, type, capacity: parseInt(capacity) || 4, status: status || "AVAILABLE" } });
  return NextResponse.json(car, { status: 201 });
}
