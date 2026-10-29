import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { wibToUTC } from "@/lib/wib";
import { notifyRecipients } from "@/lib/notiv";
import { meetingNotification } from "@/lib/notification-templates";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const booking = await prisma.meetingBooking.findUnique({
    where: { id: parseInt(id) },
    include: {
      user:        { select: { name: true, email: true, division: { select: { name: true } } } },
      meetingRoom: true,
      participants: { include: { user: { select: { id: true, name: true, email: true } } } },
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

  const booking = await prisma.meetingBooking.findUnique({
    where: { id: parseInt(id) },
    include: {
      user:         { select: { email: true } },
      participants: { select: { userId: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role !== "ADMIN" && booking.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { title, description, meetingRoomId, date, startSlot, endSlot, durationMin, participants } = body;

  if (!title || !meetingRoomId || !date || !startSlot || !endSlot || !durationMin) {
    return NextResponse.json({ error: "Lengkapi semua field yang wajib diisi" }, { status: 400 });
  }

  const participantIds: number[] = Array.isArray(participants)
    ? [...new Set(participants.map((v: unknown) => parseInt(String(v))).filter(Number.isFinite))]
    : [];

  if (participantIds.length) {
    const validCount = await prisma.user.count({
      where: { id: { in: participantIds }, active: true },
    });
    if (validCount !== participantIds.length) {
      return NextResponse.json({ error: "Peserta tidak valid atau tidak aktif" }, { status: 400 });
    }
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
      participants: {
        deleteMany: {},
        create: participantIds.map(userId => ({ userId })),
      },
    },
    include: {
      user:        { select: { name: true, email: true } },
      meetingRoom: { select: { name: true } },
      participants: { include: { user: { select: { name: true, email: true } } } },
    },
  });

  // Notify only when a schedule-relevant field actually changed.
  const beforeIds = new Set(booking.participants.map(p => p.userId));
  const participantsChanged =
    beforeIds.size !== participantIds.length ||
    participantIds.some(id => !beforeIds.has(id));
  const scheduleChanged =
    booking.title !== title ||
    booking.meetingRoomId !== parseInt(meetingRoomId) ||
    booking.startTime.getTime() !== start.getTime() ||
    booking.endTime.getTime() !== end.getTime() ||
    participantsChanged;

  let notification = null;
  if (scheduleChanged) {
    const recipients = [
      ...(updated.user.email ? [{ email: updated.user.email }] : []),
      ...updated.participants
        .map(p => ({ email: p.user.email }))
        .filter((r): r is { email: string } => Boolean(r.email)),
    ];
    if (recipients.length) {
      const payload = meetingNotification(
        {
          id: updated.id,
          title: updated.title,
          description: updated.description,
          startTime: updated.startTime,
          endTime: updated.endTime,
          meetingRoom: { name: updated.meetingRoom.name },
          participants: updated.participants.map(p => ({ name: p.user.name })),
        },
        "updated"
      );
      notification = await notifyRecipients(recipients, r => ({
        ...payload,
        idempotency_key: `meeting-updated-${updated.id}-${updated.updatedAt.getTime()}-${r.email.toLowerCase()}`,
      }));
    }
  }

  return NextResponse.json({ ...updated, notification });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id }  = await params;
  const role    = session.user.role;
  const userId  = parseInt(session.user.id);

  const booking = await prisma.meetingBooking.findUnique({
    where: { id: parseInt(id) },
    include: {
      user:         { select: { email: true } },
      meetingRoom:  { select: { name: true } },
      participants: { include: { user: { select: { name: true, email: true } } } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (role !== "ADMIN" && booking.userId !== userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Send the cancellation notice before deleting the record.
  const recipients = [
    ...(booking.user.email ? [{ email: booking.user.email }] : []),
    ...booking.participants
      .map(p => ({ email: p.user.email }))
      .filter((r): r is { email: string } => Boolean(r.email)),
  ];
  let notification = null;
  if (recipients.length) {
    const payload = meetingNotification(
      {
        id: booking.id,
        title: booking.title,
        description: booking.description,
        startTime: booking.startTime,
        endTime: booking.endTime,
        meetingRoom: { name: booking.meetingRoom.name },
        participants: booking.participants.map(p => ({ name: p.user.name })),
      },
      "cancelled"
    );
    notification = await notifyRecipients(recipients, r => ({
      ...payload,
      idempotency_key: `meeting-cancelled-${booking.id}-${r.email.toLowerCase()}`,
    }));
  }

  await prisma.meetingBooking.delete({ where: { id: parseInt(id) } });
  return NextResponse.json({ success: true, notification });
}
