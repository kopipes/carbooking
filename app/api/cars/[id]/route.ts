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
  const car = await prisma.car.update({ where: { id: parseInt(id) }, data: body });
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
