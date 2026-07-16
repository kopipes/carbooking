import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { wibToUTC, toWIBDateStr } from "@/lib/wib";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id: parseInt(id) },
    include: {
      user: { select: { name: true, email: true, division: { select: { name: true } } } },
      car:  {
        include: {
          defaultDriver: { select: { id: true, name: true, phone: true, license: true } },
        },
      },
    },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Resolve driver: per-day assignment overrides car default driver
  const bookingDate = toWIBDateStr(booking.startTime);
  const assignment  = await prisma.carAssignment.findUnique({
    where:   { carId_date: { carId: booking.carId, date: bookingDate } },
    include: { driver: { select: { id: true, name: true, phone: true, license: true } } },
  });
  const driver = assignment?.driver ?? booking.car.defaultDriver ?? null;

  return NextResponse.json({ ...booking, driver, bookingDate });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id }   = await params;
  const role     = session.user.role;
  const userId   = parseInt(session.user.id);

  const booking  = await prisma.booking.findUnique({ where: { id: parseInt(id) } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (role !== "ADMIN" && booking.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
      id:    { not: parseInt(id) },
      carId: parseInt(carId),
      OR:    [{ startTime: { lt: end }, endTime: { gt: start } }],
    },
  });
  if (conflict) {
    return NextResponse.json({ error: "Kendaraan sudah dipesan untuk waktu ini" }, { status: 409 });
  }

  const updated = await prisma.booking.update({
    where: { id: parseInt(id) },
    data: {
      title,
      description,
      carId:       parseInt(carId),
      startTime:   start,
      endTime:     end,
      durationMin: parseInt(durationMin),
    },
    include: {
      user: { select: { name: true } },
      car:  { select: { name: true, plate: true } },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id }  = await params;
  const role    = session.user.role;
  const userId  = parseInt(session.user.id);

  const booking = await prisma.booking.findUnique({ where: { id: parseInt(id) } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role !== "ADMIN" && booking.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.booking.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
