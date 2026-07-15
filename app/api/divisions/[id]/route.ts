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
  const division = await prisma.division.update({ where: { id: parseInt(id) }, data: body });
  return NextResponse.json(division);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const divisionId = parseInt(id);
  if (isNaN(divisionId)) {
    return NextResponse.json({ error: "Invalid division id" }, { status: 400 });
  }

  // Block delete if users are still assigned to this division
  const userCount = await prisma.user.count({ where: { divisionId } });
  if (userCount > 0) {
    return NextResponse.json(
      { error: `Tidak bisa menghapus divisi yang masih memiliki ${userCount} user` },
      { status: 400 }
    );
  }

  await prisma.division.delete({ where: { id: divisionId } });
  return NextResponse.json({ success: true });
}
