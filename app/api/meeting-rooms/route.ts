import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { wibToUTC } from "@/lib/wib";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const all       = searchParams.get("all") === "1";
  const date      = searchParams.get("date");
  const startTime = searchParams.get("startTime");
  const endTime   = searchParams.get("endTime");

  const where: any = all ? {} : { active: true };

  if (date && startTime && endTime) {
    const start = startTime.length <= 5 ? wibToUTC(date, startTime) : new Date(startTime);
    const end   = endTime.length   <= 5 ? wibToUTC(date, endTime)   : new Date(endTime);
    const busyRooms = await prisma.meetingBooking.findMany({
      where: { OR: [{ startTime: { lt: end }, endTime: { gt: start } }] },
      select: { meetingRoomId: true },
    });
    const busyIds = busyRooms.map(b => b.meetingRoomId);
    if (busyIds.length > 0) {
      where.id = { notIn: busyIds };
    }
  }

  const rooms = await prisma.meetingRoom.findMany({
    where,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(rooms);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const { name, capacity } = body;
  if (!name) {
    return NextResponse.json({ error: "Nama ruangan wajib diisi" }, { status: 400 });
  }
  const room = await prisma.meetingRoom.create({
    data: { name, capacity: parseInt(capacity) || 10 },
  });
  return NextResponse.json(room, { status: 201 });
}
