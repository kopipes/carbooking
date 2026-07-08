import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { wibToUTC, toWIBDateStr, TIME_SLOTS } from "@/lib/wib";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to   = searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });

  const fromUTC   = wibToUTC(from, "00:00");
  const toUTC     = wibToUTC(to,   "23:59");
  const totalCars = await prisma.car.count({ where: { status: "AVAILABLE" } });

  const bookings = await prisma.booking.findMany({
    where: { startTime: { gte: fromUTC }, endTime: { lte: toUTC } },
    select: { carId: true, startTime: true, endTime: true },
  });

  const result: Record<string, Record<string, { booked: number; total: number }>> = {};
  const cur = new Date(fromUTC);
  while (cur <= toUTC) {
    const dateStr = toWIBDateStr(cur);
    result[dateStr] = {};
    for (const slot of TIME_SLOTS) {
      const slotStart = wibToUTC(dateStr, slot.start);
      const slotEnd   = wibToUTC(dateStr, slot.end);
      const bookedCarIds = new Set(
        bookings
          .filter(b => new Date(b.startTime) < slotEnd && new Date(b.endTime) > slotStart)
          .map(b => b.carId)
      );
      result[dateStr][slot.label] = { booked: bookedCarIds.size, total: totalCars };
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  return NextResponse.json({ availability: result, totalCars });
}
