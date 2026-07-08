import Link from "next/link";
import { prisma } from "@/lib/prisma";

async function getPublicData() {
  const [totalCars, availableCars, todayBookings, upcoming] = await Promise.all([
    prisma.car.count(),
    prisma.car.count({ where: { status: "AVAILABLE" } }),
    prisma.booking.count({
      where: {
        startTime: {
          gte: new Date(new Date().setHours(0, 0, 0, 0)),
          lt: new Date(new Date().setHours(23, 59, 59, 999)),
        },
      },
    }),
    prisma.booking.findMany({
      where: { startTime: { gte: new Date() } },
      orderBy: { startTime: "asc" },
      take: 10,
      select: {
        id: true,
        title: true,
        startTime: true,
        endTime: true,
        car: { select: { name: true, plate: true } },
      },
    }),
  ]);
  return { totalCars, availableCars, todayBookings, upcoming };
}

function fmt(d: Date) {
  return new Date(d).toLocaleString("id-ID", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const TIME_SLOTS = [
  { label: "Pagi",  emoji: "🌅", startH: 7 },
  { label: "Siang", emoji: "☀️", startH: 12 },
  { label: "Sore",  emoji: "🌤️", startH: 15 },
  { label: "Malam", emoji: "🌙", startH: 18 },
];

function getSlotLabel(startTime: Date) {
  const h = new Date(startTime).getHours();
  const slot = TIME_SLOTS.find(s => s.startH === h);
  return slot ? `${slot.emoji} ${slot.label}` : null;
}

export default async function PublicDashboard() {
  const { totalCars, availableCars, todayBookings, upcoming } = await getPublicData();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-600">CarBook</h1>
          <p className="text-sm text-gray-500">Office Car Booking System</p>
        </div>
        <Link href="/login" className="bg-blue-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm">
          Sign in to Book
        </Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
            <div className="text-3xl font-bold text-blue-600">{totalCars}</div>
            <div className="text-sm text-gray-500 mt-1">Total Kendaraan</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
            <div className="text-3xl font-bold text-green-600">{availableCars}</div>
            <div className="text-sm text-gray-500 mt-1">Tersedia Sekarang</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center shadow-sm">
            <div className="text-3xl font-bold text-orange-500">{todayBookings}</div>
            <div className="text-sm text-gray-500 mt-1">Booking Hari Ini</div>
          </div>
        </div>

        <div className="bg-blue-600 rounded-2xl p-6 text-white flex flex-col sm:flex-row items-center justify-between gap-4 mb-8 shadow">
          <div>
            <h2 className="text-xl font-semibold">Butuh kendaraan?</h2>
            <p className="text-blue-100 text-sm mt-1">Login untuk cek ketersediaan dan booking dalam hitungan detik.</p>
          </div>
          <Link href="/login" className="bg-white text-blue-600 px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-50 transition-colors whitespace-nowrap text-sm">
            Booking Sekarang
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Booking Mendatang</h2>
            <p className="text-sm text-gray-400">Jadwal yang sudah dipesan</p>
          </div>
          {upcoming.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-400">Belum ada booking mendatang</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcoming.map((b) => (
                <div key={b.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{b.title}</p>
                    <p className="text-sm text-gray-500">{b.car.name} &middot; {b.car.plate}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-gray-600">{fmt(b.startTime)}</p>
                    {getSlotLabel(b.startTime) && (
                      <span className="text-xs text-gray-400">{getSlotLabel(b.startTime)}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
