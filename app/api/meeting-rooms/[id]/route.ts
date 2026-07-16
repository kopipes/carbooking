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
  const { name, capacity, active } = body;
  const data: any = {};
  if (name     !== undefined) data.name     = name;
  if (capacity !== undefined) data.capacity = parseInt(capacity);
  if (active   !== undefined) data.active   = active;

  const room = await prisma.meetingRoom.update({ where: { id: parseInt(id) }, data });
  return NextResponse.json(room);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const roomId = parseInt(id);
  if (isNaN(roomId)) {
    return NextResponse.json({ error: "Invalid room id" }, { status: 400 });
  }

  // Block delete if room has bookings
  const bookingCount = await prisma.meetingBooking.count({ where: { meetingRoomId: roomId } });
  if (bookingCount > 0) {
    return NextResponse.json(
      { error: `Tidak bisa menghapus ruangan yang masih punya ${bookingCount} booking` },
      { status: 400 }
    );
  }

  await prisma.meetingRoom.delete({ where: { id: roomId } });
  return NextResponse.json({ success: true });
}
