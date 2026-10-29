import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where = status === "sent" || status === "failed" ? { status } : {};

  const [logs, failedCount, sentCount] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.notificationLog.count({ where: { status: "failed" } }),
    prisma.notificationLog.count({ where: { status: "sent" } }),
  ]);

  return NextResponse.json({ logs, failedCount, sentCount });
}
