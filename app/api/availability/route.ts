import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { wibToUTC } from "@/lib/wib";

const TIME_SLOTS = [
  { label: "Pagi",  start: "07:00", end: "12:00" },
  { label: "Siang", start: "12:00", end: "15:00" },
  { label: "Sore",  start: "15:00", end: "18:00" },
  { label: "Malam", start: "18:00", end: "22:00" },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from"); // WIB YYYY-MM-DD
  const to   = searchParams.get("to");   // WIB YYYY-MM-DD
  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });

  // Query boundary: from 00:00 WIB on `from` to 23:59:59 WIB on `to`
  const fromUTC = wibToUTC(from, "00:00");
  const toUTC   = wibToUTC(to,   "23:59");

  const totalCars = await prisma.car.count({ where: { status: "AVAILABLE" } });

  const bookings = await prisma.booking.findMany({
    where: {
      startTime: { gte: fromUTC },
      endTime:   { lte: toUTC },
    },
    select: { carId: true, startTime: true, endTime: true },
  });

  const result: Record<string, Record<string, { booked: number; total: number }>> = {};

  // Enumerate WIB days
  const cur = new Date(fromUTC);
  const end = new Date(toUTC);
  while (cur <= end) {
    const dateStr = new Date(cur.getTime() + 7 * 3600000).toISOString().split("T")[0];
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
