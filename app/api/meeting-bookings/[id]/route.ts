import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { wibToUTC } from "@/lib/wib";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const booking = await prisma.meetingBooking.findUnique({
    where: { id: parseInt(id) },
    include: {
      user:        { select: { name: true, email: true, division: { select: { name: true } } } },
      meetingRoom: true,
    },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Non-admin can only see their own
  if (session.user.role === "USER" && String(booking.userId) !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json(booking);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id }  = await params;
  const role    = session.user.role;
  const userId  = parseInt(session.user.id);

  const booking = await prisma.meetingBooking.findUnique({ where: { id: parseInt(id) } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role !== "ADMIN" && booking.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, meetingRoomId, date, startSlot, endSlot, durationMin } = body;

  if (!title || !meetingRoomId || !date || !startSlot || !endSlot || !durationMin) {
    return NextResponse.json({ error: "Lengkapi semua field yang wajib diisi" }, { status: 400 });
  }

  const start = wibToUTC(date, startSlot);
  const end   = wibToUTC(date, endSlot);

  if (end <= start) {
    return NextResponse.json({ error: "Jam selesai harus lebih dari jam mulai" }, { status: 400 });
  }

  const conflict = await prisma.meetingBooking.findFirst({
    where: {
      id:            { not: parseInt(id) },
      meetingRoomId: parseInt(meetingRoomId),
      OR:            [{ startTime: { lt: end }, endTime: { gt: start } }],
    },
  });
  if (conflict) {
    return NextResponse.json({ error: "Ruangan sudah dipesan untuk waktu ini" }, { status: 409 });
  }

  const updated = await prisma.meetingBooking.update({
    where: { id: parseInt(id) },
    data: {
      title,
      description,
      meetingRoomId: parseInt(meetingRoomId),
      startTime:     start,
      endTime:       end,
      durationMin:   parseInt(durationMin),
    },
    include: {
      user:        { select: { name: true } },
      meetingRoom: { select: { name: true } },
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

  const booking = await prisma.meetingBooking.findUnique({ where: { id: parseInt(id) } });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role !== "ADMIN" && booking.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.meetingBooking.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true });
}
