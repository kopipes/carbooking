import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const events = await prisma.booking.findMany({
    where: {
      startTime: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      car: { select: { name: true } },
    },
  });
  return NextResponse.json(events);
}
