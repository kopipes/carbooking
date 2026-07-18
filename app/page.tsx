import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { toWIBDateStr, wibToUTC } from "@/lib/wib";

async function getTodayData() {
  // Get today's date string in WIB (UTC+7)
  const todayStr     = toWIBDateStr(new Date());
  const todayWIBStart = wibToUTC(todayStr, "00:00");
  const todayWIBEnd   = wibToUTC(todayStr, "23:59");

  const [carBookings, meetingBookings] = await Promise.all([
    prisma.booking.findMany({
      where: { startTime: { gte: todayWIBStart, lt: todayWIBEnd } },
      orderBy: { startTime: "asc" },
      select: {
        id:        true,
        title:     true,
        startTime: true,
        endTime:   true,
        car:       { select: { name: true, plate: true } },
        user:      { select: { name: true } },
      },
    }),
    prisma.meetingBooking.findMany({
      where: { startTime: { gte: todayWIBStart, lt: todayWIBEnd } },
      orderBy: { startTime: "asc" },
      select: {
        id:          true,
        title:       true,
        startTime:   true,
        endTime:     true,
        meetingRoom: { select: { name: true } },
        user:        { select: { name: true } },
      },
    }),
  ]);

  return { carBookings, meetingBookings };
}

export default async function PublicPage() {
  const { carBookings, meetingBookings } = await getTodayData();
  const todayLabel = new Date().toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <span className="text-xl font-bold text-blue-600">Booking</span>
        <Link
          href="/login"
          className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
        >
          Sign in to Book
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Jadwal Hari Ini</h2>
          <p className="text-sm text-gray-500 mt-0.5">{todayLabel} WIB</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Jadwal Kendaraan */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
              <h3 className="font-semibold text-gray-700">Kendaraan</h3>
              <span className="ml-auto text-xs text-gray-400">{carBookings.length} booking</span>
            </div>
            {carBookings.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">Tidak ada booking kendaraan hari ini</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {carBookings.map(b => (
                  <div key={b.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{b.title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {b.car.name} · {b.car.plate} · {b.user.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-600 whitespace-nowrap">
                        {new Date(b.startTime).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(b.endTime).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-xs text-gray-400">WIB</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Jadwal Meeting Room */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
              <h3 className="font-semibold text-gray-700">Meeting Room</h3>
              <span className="ml-auto text-xs text-gray-400">{meetingBookings.length} booking</span>
            </div>
            {meetingBookings.length === 0 ? (
              <div className="py-10 text-center text-sm text-gray-400">Tidak ada booking meeting room hari ini</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {meetingBookings.map(b => (
                  <div key={b.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{b.title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {b.meetingRoom.name} · {b.user.name}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-gray-600 whitespace-nowrap">
                        {new Date(b.startTime).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })}
                        {" – "}
                        {new Date(b.endTime).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-xs text-gray-400">WIB</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
