import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { wibToUTC } from "@/lib/wib";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const carId = searchParams.get("carId") ? parseInt(searchParams.get("carId")!) : undefined;
  const userId = (session.user as any).role === "USER"
    ? parseInt((session.user as any).id)
    : undefined;

  const where: any = {};
  if (carId) where.carId = carId;
  if (userId) where.userId = userId;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { startTime: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
        car: { select: { name: true, plate: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return NextResponse.json({ bookings, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, carId, startTimeWIB, endTimeWIB, date, startSlot, endSlot, durationMin } = body;

  if (!title || !carId || !durationMin) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Accept either pre-built ISO strings or WIB date+time components
  let start: Date, end: Date;
  if (startTimeWIB && endTimeWIB) {
    // WIB date+time strings: "2026-07-08" + "07:00"
    start = wibToUTC(startTimeWIB.split("T")[0], startTimeWIB.split("T")[1]);
    end   = wibToUTC(endTimeWIB.split("T")[0],   endTimeWIB.split("T")[1]);
  } else if (date && startSlot && endSlot) {
    start = wibToUTC(date, startSlot);
    end   = wibToUTC(date, endSlot);
  } else {
    return NextResponse.json({ error: "Missing time fields" }, { status: 400 });
  }

  // Conflict check
  const conflict = await prisma.booking.findFirst({
    where: {
      carId: parseInt(carId),
      OR: [{ startTime: { lt: end }, endTime: { gt: start } }],
    },
  });

  if (conflict) {
    return NextResponse.json({ error: "Kendaraan sudah dipesan untuk waktu ini" }, { status: 409 });
  }

  const booking = await prisma.booking.create({
    data: {
      title,
      description,
      carId: parseInt(carId),
      userId: parseInt((session.user as any).id),
      startTime: start,
      endTime: end,
      durationMin: parseInt(durationMin),
    },
    include: {
      user: { select: { name: true } },
      car: { select: { name: true, plate: true } },
    },
  });

  return NextResponse.json(booking, { status: 201 });
}
