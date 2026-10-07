import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { wibToUTC } from "@/lib/wib";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const page  = parseInt(searchParams.get("page")  ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "10");
  const mine  = searchParams.get("mine") === "1";
  const q     = searchParams.get("q")?.trim() ?? "";
  const from  = searchParams.get("from");
  const to    = searchParams.get("to");
  const before = searchParams.get("before");
  const after  = searchParams.get("after");
  const order  = searchParams.get("order") === "desc" ? "desc" : "asc";

  const where: any = {};
  if (mine) where.userId = parseInt(session.user.id);
  if (from && to) {
    const fromUTC = wibToUTC(from, "00:00");
    const toUTC   = wibToUTC(to,   "23:59");
    where.startTime = { gte: fromUTC, lte: toUTC };
  }
  if (before) where.endTime = { ...(where.endTime ?? {}), lt: new Date(before) };
  if (after)  where.endTime = { ...(where.endTime ?? {}), gte: new Date(after) };
  if (q) {
    where.OR = [
      { title:       { contains: q } },
      { description: { contains: q } },
      { user:        { name: { contains: q } } },
      { meetingRoom: { name: { contains: q } } },
    ];
  }

  const [bookings, total] = await Promise.all([
    prisma.meetingBooking.findMany({
      where,
      orderBy: { startTime: order },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user:        { select: { name: true, email: true } },
        meetingRoom: { select: { name: true, capacity: true } },
      },
    }),
    prisma.meetingBooking.count({ where }),
  ]);

  return NextResponse.json({ bookings, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      meetingRoomId: parseInt(meetingRoomId),
      OR: [{ startTime: { lt: end }, endTime: { gt: start } }],
    },
  });
  if (conflict) {
    return NextResponse.json({ error: "Ruangan sudah dipesan untuk waktu ini" }, { status: 409 });
  }

  const booking = await prisma.meetingBooking.create({
    data: {
      title,
      description,
      meetingRoomId: parseInt(meetingRoomId),
      userId:        parseInt(session.user.id),
      startTime:     start,
      endTime:       end,
      durationMin:   parseInt(durationMin),
    },
    include: {
      user:        { select: { name: true } },
      meetingRoom: { select: { name: true } },
    },
  });
  return NextResponse.json(booking, { status: 201 });
}
