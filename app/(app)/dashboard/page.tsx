import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { fmtWIB, toWIBDateStr } from "@/lib/wib";

async function getDashboardData(userId: number, role: string) {
  const isAdmin = role === "ADMIN" || role === "MANAGER";
  const nowUTC = new Date();
  const [myUpcoming, recentBookings, availableCars] = await Promise.all([
    prisma.booking.findMany({
      where: { userId, startTime: { gte: nowUTC } },
      orderBy: { startTime: "asc" },
      take: 5,
      include: { car: { select: { name: true, plate: true } } },
    }),
    prisma.booking.findMany({
      where: isAdmin ? {} : { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { name: true } },
        car: { select: { name: true, plate: true } },
      },
    }),
    prisma.car.count({ where: { status: "AVAILABLE" } }),
  ]);
  return { myUpcoming, recentBookings, availableCars };
}

const TIME_SLOTS = [
  { label: "Pagi",  emoji: "🌅", startH: 7  },
  { label: "Siang", emoji: "☀️", startH: 12 },
  { label: "Sore",  emoji: "🌤️", startH: 15 },
  { label: "Malam", emoji: "🌙", startH: 18 },
];

function getSlotLabel(startTime: Date) {
  const wibH = new Date(new Date(startTime).getTime() + 7 * 3600000).getUTCHours();
  const slot = TIME_SLOTS.find(s => s.startH === wibH);
  return slot ? `${slot.emoji} ${slot.label}` : null;
}

export default async function DashboardPage() {
  const session = await auth();
  const userId = parseInt((session?.user as any)?.id);
  const role   = (session?.user as any)?.role ?? "USER";
  const { myUpcoming, recentBookings, availableCars } = await getDashboardData(userId, role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm">Selamat datang, {session?.user?.name}</p>
        </div>
        <Link href="/bookings/new" className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">
          + Booking Kendaraan
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{availableCars}</div>
          <div className="text-xs text-gray-500 mt-1">Kendaraan Tersedia</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{myUpcoming.length}</div>
          <div className="text-xs text-gray-500 mt-1">Booking Mendatang</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-2xl font-bold text-gray-700">{recentBookings.length}</div>
          <div className="text-xs text-gray-500 mt-1">Booking Terakhir</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Booking Mendatang Saya</h2>
            <Link href="/bookings" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          {myUpcoming.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">Belum ada booking mendatang</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {myUpcoming.map(b => (
                <Link key={b.id} href={`/bookings/${b.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{b.title}</p>
                    <p className="text-xs text-gray-500">
                      {b.car.name} · {fmtWIB(b.startTime, { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })} WIB
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">{getSlotLabel(b.startTime)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">{role === "USER" ? "Booking Terakhir Saya" : "Booking Terakhir"}</h2>
            <Link href="/bookings" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          {recentBookings.length === 0 ? (
            <div className="px-5 py-10 text-center text-gray-400 text-sm">Belum ada booking</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentBookings.map(b => (
                <Link key={b.id} href={`/bookings/${b.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{b.title}</p>
                    <p className="text-xs text-gray-500">{b.user.name} · {b.car.name}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-xs text-gray-500">
                      {fmtWIB(b.startTime, { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })} WIB
                    </p>
                    <span className="text-xs text-gray-400">{getSlotLabel(b.startTime)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
