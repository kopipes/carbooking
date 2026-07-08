import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const [totalCars, availableCars, todayBookings, upcomingBookings] = await Promise.all([
    prisma.car.count(),
    prisma.car.count({ where: { status: "AVAILABLE" } }),
    prisma.booking.count({
      where: {
        startTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
    prisma.booking.findMany({
      where: { startTime: { gte: new Date() } },
      orderBy: { startTime: "asc" },
      take: 20,
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        car: { select: { name: true, plate: true } },
      },
    }),
  ]);

  return NextResponse.json({ totalCars, availableCars, todayBookings, upcomingBookings });
}
