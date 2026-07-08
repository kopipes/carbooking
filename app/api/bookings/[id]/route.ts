import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { wibToUTC } from "@/lib/wib";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const booking = await prisma.booking.findUnique({
    where: { id: parseInt(id) },
    include: {
      user: { select: { name: true, email: true, division: { select: { name: true } } } },
      car: {
        include: {
          assignments: {
            where: { date: { gte: "2000-01-01" } }, // will filter below
            include: { driver: { select: { id: true, name: true, phone: true, license: true } } },
          },
        },
      },
    },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Find driver assigned to this car on the booking date (WIB)
  const bookingDate = new Date(new Date(booking.startTime).getTime() + 7 * 3600000)
    .toISOString().split("T")[0];
  const assignment = await prisma.carAssignment.findUnique({
    where: { carId_date: { carId: booking.carId, date: bookingDate } },
    include: { driver: { select: { id: true, name: true, phone: true, license: true } } },
  });

  return NextResponse.json({ ...booking, driver: assignment?.driver ?? null, bookingDate });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role   = (session.user as any).role;
  const userId = parseInt((session.user as any).id);

  const booking = await prisma.booking.findUnique({ where: { id: parseInt(id) } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only admin or booking owner can edit
  if (role !== "ADMIN" && booking.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, carId, date, startSlot, endSlot, durationMin } = body;

  const start = wibToUTC(date, startSlot);
  const end   = wibToUTC(date, endSlot);

  // Conflict check — exclude current booking
  const conflict = await prisma.booking.findFirst({
    where: {
      id: { not: parseInt(id) },
      carId: parseInt(carId),
      OR: [{ startTime: { lt: end }, endTime: { gt: start } }],
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
      carId: parseInt(carId),
      startTime: start,
      endTime: end,
      durationMin: parseInt(durationMin),
    },
    include: {
      user: { select: { name: true } },
      car: { select: { name: true, plate: true } },
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const role   = (session.user as any).role;
  const userId = parseInt((session.user as any).id);

  const booking = await prisma.booking.findUnique({ where: { id: parseInt(id) } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role !== "ADMIN" && booking.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.booking.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
