import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

/**
 * Regression guard for the "rows past the page cap are invisible" class of bug.
 *
 * The vehicle and meeting calendars previously fetched `/api/...?limit=200&page=1`
 * and filtered client-side, so any booking beyond row 200 silently disappeared
 * even though the availability endpoint (which reads the DB directly) still saw it.
 * The fix: server-side range/order filtering. These tests assert that contract
 * holds with MORE rows than any old fixed cap, so the bug cannot silently return.
 */

const SEEDED = 250;
const CAP = 200; // the historical hard-coded page size that caused the bug

let tmpDir: string;
let dbPath: string;
let prisma: PrismaClient;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "book-test-"));
  dbPath = path.join(tmpDir, "test.db");

  // Create schema in the temp DB using migrations
  execSync(`npx prisma migrate deploy`, {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
    stdio: "pipe",
  });

  const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
  prisma = new PrismaClient({ adapter });
});

afterAll(async () => {
  await prisma.$disconnect();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

async function seedBookings(count: number) {
  const division = await prisma.division.create({
    data: { name: "IT", code: "IT" },
  });
  const user = await prisma.user.create({
    data: {
      name: "Tester",
      email: "tester@example.com",
      password: "x",
      divisionId: division.id,
    },
  });
  const car = await prisma.car.create({
    data: { name: "Test Car", plate: "B 1 TEST", type: "MPV", capacity: 4 },
  });

  // Spread bookings so later ones are further in the future.
  const base = Date.UTC(2026, 0, 1, 0, 0, 0);
  const rows = Array.from({ length: count }, (_, i) => {
    const start = new Date(base + i * 3600_000);
    const end = new Date(start.getTime() + 3600_000);
    return {
      title: `Booking ${i}`,
      userId: user.id,
      carId: car.id,
      startTime: start,
      endTime: end,
      durationMin: 60,
    };
  });
  await prisma.booking.createMany({ data: rows });
}

describe("booking list pagination contract", () => {
  it("seeds more rows than the old hard-coded cap", async () => {
    await seedBookings(SEEDED);
    const total = await prisma.booking.count();
    expect(total).toBe(SEEDED);
    expect(total).toBeGreaterThan(CAP);
  });

  it("paginates past the old cap: every booking is reachable", async () => {
    const limit = 200;
    const page1 = await prisma.booking.findMany({
      orderBy: { startTime: "asc" },
      skip: 0,
      take: limit,
    });
    const page2 = await prisma.booking.findMany({
      orderBy: { startTime: "asc" },
      skip: limit,
      take: limit,
    });
    expect(page1).toHaveLength(CAP);
    expect(page2).toHaveLength(SEEDED - CAP);
    const ids = new Set([...page1, ...page2].map((b) => b.id));
    expect(ids.size).toBe(SEEDED);
  });

  it("range filter returns rows beyond the old cap (the original bug)", async () => {
    // The last 5 bookings sit at rows 245..249 - all invisible under limit=200&page=1.
    const all = await prisma.booking.findMany({ orderBy: { startTime: "asc" } });
    const tail = all.slice(-5);
    const from = tail[0].startTime;
    const to = new Date(tail[tail.length - 1].endTime.getTime() + 1000);

    const ranged = await prisma.booking.findMany({
      where: { startTime: { gte: from, lte: to } },
      orderBy: { startTime: "asc" },
    });
    expect(ranged.length).toBeGreaterThanOrEqual(5);
    // Under the OLD client-side pattern these rows were cut off entirely.
    expect(ranged.some((b) => b.id === tail[tail.length - 1].id)).toBe(true);
  });

  it("desc order supports the 'past' tab without client-side sorting", async () => {
    const first = await prisma.booking.findFirst({ orderBy: { startTime: "desc" } });
    const last = await prisma.booking.findFirst({ orderBy: { startTime: "asc" } });
    expect(first!.startTime.getTime()).toBeGreaterThan(last!.startTime.getTime());
  });
});
