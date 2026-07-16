import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { toWIBDateStr, wibToUTC } from "@/lib/wib";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page   = parseInt(searchParams.get("page")  ?? "1");
  const limit  = parseInt(searchParams.get("limit") ?? "10");
  const carId  = searchParams.get("carId") ? parseInt(searchParams.get("carId")!) : undefined;
  const q      = searchParams.get("q")?.trim() ?? "";
  const mine   = searchParams.get("mine") === "1";
  const userId = mine ? parseInt(session.user.id) : undefined;

  const where: any = {};
  if (carId)  where.carId  = carId;
  if (userId) where.userId = userId;
  if (q) {
    where.OR = [
      { title:       { contains: q } },
      { description: { contains: q } },
      { user: { name:  { contains: q } } },
      { car:  { name:  { contains: q } } },
      { car:  { plate: { contains: q } } },
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      orderBy: { startTime: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { name: true, email: true } },
        car:  {
          select: {
            name:            true,
            plate:           true,
            defaultDriver:   { select: { name: true, phone: true } },
          },
        },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  // Batch-fetch driver assignments — one query for all bookings (no N+1)
  const datesToFetch = [...new Set(bookings.map(b => toWIBDateStr(b.startTime)))];
  const carIds       = [...new Set(bookings.map(b => b.carId))];

  const assignments = datesToFetch.length > 0
    ? await prisma.carAssignment.findMany({
        where: { carId: { in: carIds }, date: { in: datesToFetch } },
        select: {
          carId:  true,
          date:   true,
          driver: { select: { name: true, phone: true } },
        },
      })
    : [];

  // Build lookup map: "carId_date" -> assigned driver (per-day override)
  const driverMap = new Map<string, { name: string; phone: string | null } | null>();
  assignments.forEach(a => driverMap.set(`${a.carId}_${a.date}`, a.driver));

  // Resolver: per-day assignment > car default driver > null
  const bookingsWithDriver = bookings.map(b => {
    const dayDriver = driverMap.get(`${b.carId}_${toWIBDateStr(b.startTime)}`);
    const driver    = dayDriver ?? b.car.defaultDriver ?? null;
    // Strip defaultDriver from car payload so response shape stays clean
    const { defaultDriver, ...carRest } = b.car;
    return { ...b, car: carRest, driver };
  });

  return NextResponse.json({ bookings: bookingsWithDriver, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, description, carId, date, startSlot, endSlot, durationMin } = body;

  if (!title || !carId || !date || !startSlot || !endSlot || !durationMin) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const start = wibToUTC(date, startSlot);
  const end   = wibToUTC(date, endSlot);

  if (end <= start) {
    return NextResponse.json({ error: "Jam selesai harus lebih dari jam mulai" }, { status: 400 });
  }

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
      carId:       parseInt(carId),
      userId:      parseInt(session.user.id),
      startTime:   start,
      endTime:     end,
      durationMin: parseInt(durationMin),
    },
    include: {
      user: { select: { name: true } },
      car:  { select: { name: true, plate: true } },
    },
  });

  return NextResponse.json(booking, { status: 201 });
}
