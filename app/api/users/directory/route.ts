import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Lightweight user directory for picking meeting participants.
 * Available to any signed-in user (unlike /api/users, which is ADMIN-only)
 * and exposes only the fields needed to choose a recipient.
 */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      division: { select: { name: true } },
    },
  });

  return NextResponse.json(users);
}
