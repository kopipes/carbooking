import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { fmtWIB } from "@/lib/wib";

async function getDashboardData(userId: number, role: string) {
  const isAdmin = role === "ADMIN" || role === "MANAGER";
  // Today WIB: start = 00:00 WIB (UTC-7 offset) = UTC 17:00 yesterday, end = 23:59 WIB
  const now = new Date();
  const todayWIBStart = new Date(now);
  todayWIBStart.setUTCHours(0 - 7, 0, 0, 0);
  const todayWIBEnd = new Date(todayWIBStart);
  todayWIBEnd.setUTCHours(todayWIBStart.getUTCHours() + 24);

  const [todayCar, todayMeeting, availableCars, availableRooms] = await Promise.all([
    prisma.booking.findMany({
      where: isAdmin
        ? { startTime: { gte: todayWIBStart, lt: todayWIBEnd } }
        : { userId, startTime: { gte: todayWIBStart, lt: todayWIBEnd } },
      orderBy: { startTime: "asc" },
      include: {
        user: { select: { name: true } },
        car:  { select: { name: true, plate: true } },
      },
    }),
    prisma.meetingBooking.findMany({
      where: isAdmin
        ? { startTime: { gte: todayWIBStart, lt: todayWIBEnd } }
        : { userId, startTime: { gte: todayWIBStart, lt: todayWIBEnd } },
      orderBy: { startTime: "asc" },
      include: {
        user:        { select: { name: true } },
        meetingRoom: { select: { name: true } },
      },
    }),
    prisma.car.count({ where: { status: "AVAILABLE" } }),
    prisma.meetingRoom.count({ where: { active: true } }),
  ]);

  return { todayCar, todayMeeting, availableCars, availableRooms };
}

export default async function DashboardPage() {
  const session = await auth();
  const userId  = parseInt(session!.user.id);
  const role    = session!.user.role ?? "USER";
  const { todayCar, todayMeeting, availableCars, availableRooms } = await getDashboardData(userId, role);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm">Selamat datang, {session?.user?.name}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/bookings/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">
            + Booking Kendaraan
          </Link>
          <Link href="/meeting-bookings/new"
            className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors text-sm">
            + Booking Ruangan
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-2xl font-bold text-blue-600">{availableCars}</div>
          <div className="text-xs text-gray-500 mt-1">Kendaraan Tersedia</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-2xl font-bold text-purple-600">{availableRooms}</div>
          <div className="text-xs text-gray-500 mt-1">Ruangan Aktif</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-2xl font-bold text-green-600">{todayCar.length}</div>
          <div className="text-xs text-gray-500 mt-1">Booking Kendaraan Hari Ini</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <div className="text-2xl font-bold text-orange-500">{todayMeeting.length}</div>
          <div className="text-xs text-gray-500 mt-1">Booking Ruangan Hari Ini</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Kendaraan Hari Ini */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Booking Kendaraan Hari Ini</h2>
            <Link href="/bookings" className="text-xs text-blue-600 hover:underline">Lihat semua</Link>
          </div>
          {todayCar.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">Tidak ada booking kendaraan hari ini</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayCar.map(b => (
                <Link key={b.id} href={`/bookings/${b.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{b.title}</p>
                    <p className="text-xs text-gray-500">{b.user.name} · {b.car.name} ({b.car.plate})</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-xs text-gray-500">
                      {fmtWIB(b.startTime, { hour:"2-digit", minute:"2-digit" })} – {fmtWIB(b.endTime, { hour:"2-digit", minute:"2-digit" })} WIB
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Booking Meeting Room Hari Ini */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Booking Meeting Room Hari Ini</h2>
            <Link href="/meeting-bookings" className="text-xs text-purple-600 hover:underline">Lihat semua</Link>
          </div>
          {todayMeeting.length === 0 ? (
            <div className="py-10 text-center text-gray-400 text-sm">Tidak ada booking meeting room hari ini</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {todayMeeting.map(b => (
                <Link key={b.id} href={`/meeting-bookings/${b.id}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{b.title}</p>
                    <p className="text-xs text-gray-500">{b.user.name} · {b.meetingRoom.name}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-xs text-gray-500">
                      {fmtWIB(b.startTime, { hour:"2-digit", minute:"2-digit" })} – {fmtWIB(b.endTime, { hour:"2-digit", minute:"2-digit" })} WIB
                    </p>
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
