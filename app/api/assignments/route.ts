import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date  = searchParams.get("date");  // WIB YYYY-MM-DD
  const carId = searchParams.get("carId");

  const where: any = {};
  if (date)  where.date  = date;
  if (carId) where.carId = parseInt(carId);

  const assignments = await prisma.carAssignment.findMany({
    where,
    include: {
      car:    { select: { id: true, name: true, plate: true } },
      driver: { select: { id: true, name: true, phone: true } },
    },
    orderBy: { date: "asc" },
  });
  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { carId, driverId, date, note } = body;
  if (!carId || !driverId || !date) {
    return NextResponse.json({ error: "carId, driverId, date required" }, { status: 400 });
  }

  // Upsert: replace existing assignment for this car+date
  const assignment = await prisma.carAssignment.upsert({
    where: { carId_date: { carId: parseInt(carId), date } },
    update: { driverId: parseInt(driverId), note },
    create: { carId: parseInt(carId), driverId: parseInt(driverId), date, note },
    include: {
      car:    { select: { name: true, plate: true } },
      driver: { select: { name: true, phone: true } },
    },
  });
  return NextResponse.json(assignment, { status: 201 });
}
