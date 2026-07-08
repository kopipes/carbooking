import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { wibToUTC } from "@/lib/wib";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const where: any = { status: "AVAILABLE" };

  const date       = searchParams.get("date");       // WIB YYYY-MM-DD
  const startTime  = searchParams.get("startTime");  // WIB HH:MM or full ISO
  const endTime    = searchParams.get("endTime");    // WIB HH:MM or full ISO

  if (startTime && endTime) {
    let start: Date, end: Date;

    // If HH:MM format, combine with date
    if (startTime.length <= 5 && date) {
      start = wibToUTC(date, startTime);
      end   = wibToUTC(date, endTime);
    } else {
      // Full ISO string
      start = new Date(startTime);
      end   = new Date(endTime);
    }

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
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const car = await prisma.car.create({ data: body });
  return NextResponse.json(car, { status: 201 });
}
