import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();

  // Whitelist allowed fields
  const { name, plate, type, capacity, status, defaultDriverId } = body;
  const data: any = {};
  if (name     !== undefined) data.name     = name;
  if (plate    !== undefined) data.plate    = plate;
  if (type     !== undefined) data.type     = type;
  if (capacity !== undefined) data.capacity = parseInt(capacity);
  if (status   !== undefined) data.status   = status;
  if (defaultDriverId !== undefined) {
    data.defaultDriverId = defaultDriverId === null || defaultDriverId === "" ? null : parseInt(defaultDriverId);
  }

  const car = await prisma.car.update({
    where: { id: parseInt(id) },
    data,
    include: { defaultDriver: { select: { id: true, name: true, phone: true } } },
  });
  return NextResponse.json(car);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const carId = parseInt(id);
  if (isNaN(carId)) {
    return NextResponse.json({ error: "Invalid car id" }, { status: 400 });
  }

  // Cascade: delete related records first (SQLite doesn't enforce FK cascade by default)
  await prisma.$transaction([
    prisma.carAssignment.deleteMany({ where: { carId } }),
    prisma.booking.deleteMany({ where: { carId } }),
    prisma.car.delete({ where: { id: carId } }),
  ]);
  return NextResponse.json({ success: true });
}
