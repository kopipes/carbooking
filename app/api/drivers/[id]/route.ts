import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const { name, phone, license } = body;
  const driver = await prisma.driver.update({
    where: { id: parseInt(id) },
    data: { name, phone, license },
  });
  return NextResponse.json(driver);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const driverId = parseInt(id);
  if (isNaN(driverId)) {
    return NextResponse.json({ error: "Invalid driver id" }, { status: 400 });
  }

  // Block delete if driver is set as default for any car
  const defaultCount = await prisma.car.count({ where: { defaultDriverId: driverId } });
  if (defaultCount > 0) {
    return NextResponse.json(
      { error: `Tidak bisa menghapus driver yang masih jadi default di ${defaultCount} mobil` },
      { status: 400 }
    );
  }

  // Block delete if driver has scheduled assignments
  const assignCount = await prisma.carAssignment.count({ where: { driverId } });
  if (assignCount > 0) {
    return NextResponse.json(
      { error: `Tidak bisa menghapus driver yang masih punya ${assignCount} penugasan terjadwal` },
      { status: 400 }
    );
  }

  await prisma.driver.delete({ where: { id: driverId } });
  return NextResponse.json({ success: true });
}
