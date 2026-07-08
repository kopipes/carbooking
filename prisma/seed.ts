import path from "path";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient, Role, CarStatus } from "../app/generated/prisma/client";
import bcrypt from "bcryptjs";

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

async function main() {
  const divIT = await prisma.division.upsert({
    where: { code: "IT" }, update: {},
    create: { name: "Information Technology", code: "IT", desc: "IT Department" },
  });
  const divHR = await prisma.division.upsert({
    where: { code: "HR" }, update: {},
    create: { name: "Human Resources", code: "HR", desc: "HR Department" },
  });
  await prisma.division.upsert({
    where: { code: "FIN" }, update: {},
    create: { name: "Finance", code: "FIN", desc: "Finance Department" },
  });
  const divOPS = await prisma.division.upsert({
    where: { code: "OPS" }, update: {},
    create: { name: "Operations", code: "OPS", desc: "Operations Department" },
  });

  const adminPass = await bcrypt.hash("admin123", 10);
  const userPass  = await bcrypt.hash("user123", 10);

  await prisma.user.upsert({
    where: { email: "admin@company.com" }, update: {},
    create: { name: "System Admin", email: "admin@company.com", password: adminPass, role: Role.ADMIN, phone: "08110000001", divisionId: divIT.id },
  });
  const manager = await prisma.user.upsert({
    where: { email: "manager@company.com" }, update: {},
    create: { name: "Budi Santoso", email: "manager@company.com", password: adminPass, role: Role.MANAGER, phone: "08110000002", divisionId: divOPS.id },
  });
  const user1 = await prisma.user.upsert({
    where: { email: "andi@company.com" }, update: {},
    create: { name: "Andi Pratama", email: "andi@company.com", password: userPass, role: Role.USER, phone: "08110000003", divisionId: divIT.id },
  });
  const user2 = await prisma.user.upsert({
    where: { email: "sari@company.com" }, update: {},
    create: { name: "Sari Dewi", email: "sari@company.com", password: userPass, role: Role.USER, phone: "08110000004", divisionId: divHR.id },
  });

  const car1 = await prisma.car.upsert({ where: { plate: "B 1234 XX" }, update: {}, create: { name: "Toyota Avanza", plate: "B 1234 XX", type: "MPV", capacity: 7, status: CarStatus.AVAILABLE } });
  const car2 = await prisma.car.upsert({ where: { plate: "B 5678 YY" }, update: {}, create: { name: "Honda CR-V",    plate: "B 5678 YY", type: "SUV", capacity: 5, status: CarStatus.AVAILABLE } });
  const car3 = await prisma.car.upsert({ where: { plate: "B 9012 ZZ" }, update: {}, create: { name: "Toyota Innova", plate: "B 9012 ZZ", type: "MPV", capacity: 8, status: CarStatus.AVAILABLE } });
  await prisma.car.upsert({ where: { plate: "B 3456 AA" }, update: {}, create: { name: "Suzuki Ertiga", plate: "B 3456 AA", type: "MPV", capacity: 7, status: CarStatus.MAINTENANCE } });

  const now = new Date();
  const today7am  = new Date(now); today7am.setHours(7,  0, 0, 0);
  const today12pm = new Date(now); today12pm.setHours(12, 0, 0, 0);
  const today15pm = new Date(now); today15pm.setHours(15, 0, 0, 0);
  const today18pm = new Date(now); today18pm.setHours(18, 0, 0, 0);
  const tomorrow7am  = new Date(now); tomorrow7am.setDate(tomorrow7am.getDate() + 1);  tomorrow7am.setHours(7, 0, 0, 0);
  const tomorrow12pm = new Date(now); tomorrow12pm.setDate(tomorrow12pm.getDate() + 1); tomorrow12pm.setHours(12, 0, 0, 0);

  const bookingCount = await prisma.booking.count();
  if (bookingCount === 0) {
    await prisma.booking.create({ data: { title: "Kunjungan Klien", description: "Jemput klien dari bandara", userId: user1.id, carId: car1.id, startTime: today7am,  endTime: today12pm, durationMin: 300 } });
    await prisma.booking.create({ data: { title: "Training HR Offsite", description: "Antar ke venue training",    userId: user2.id, carId: car2.id, startTime: today15pm, endTime: today18pm, durationMin: 180 } });
    await prisma.booking.create({ data: { title: "Rapat Manajemen",     description: "Rapat di balai kota",       userId: manager.id, carId: car3.id, startTime: tomorrow7am,  endTime: tomorrow12pm, durationMin: 300 } });
  }

  console.log("Seed selesai");
  console.log("  Admin:   admin@company.com / admin123");
  console.log("  Manager: manager@company.com / admin123");
  console.log("  User:    andi@company.com / user123");
  console.log("  User:    sari@company.com / user123");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
