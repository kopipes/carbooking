"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { toWIBDateStr, fmtDateWIB, fmtTimeWIB } from "@/lib/wib";

const TIME_SLOTS = [
  { label: "Pagi",  emoji: "🌅", startH: 7  },
  { label: "Siang", emoji: "☀️", startH: 12 },
  { label: "Sore",  emoji: "🌤️", startH: 15 },
  { label: "Malam", emoji: "🌙", startH: 18 },
];

function getSlotLabel(startTime: string) {
  const wibH = new Date(new Date(startTime).getTime() + 7 * 3600000).getUTCHours();
  const slot = TIME_SLOTS.find(s => s.startH === wibH);
  return slot ? `${slot.emoji} ${slot.label}` : "⏰ Custom";
}

export default function BookingsPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["bookings", page],
    queryFn: async () => {
      const res = await fetch(`/api/bookings?page=${page}&limit=10`);
      return res.json();
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Booking</h1>
        <Link href="/bookings/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
          + Booking Baru
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Memuat...</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Keperluan</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Kendaraan</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Dipesan oleh</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Tanggal</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Slot</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Jam (WIB)</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data?.bookings?.length === 0 ? (
                    <tr><td colSpan={7} className="py-12 text-center text-gray-400">Tidak ada data booking</td></tr>
                  ) : (
                    data?.bookings?.map((b: any) => (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-800">{b.title}</td>
                        <td className="px-4 py-3 text-gray-600">
                          {b.car.name}<br/>
                          <span className="text-xs text-gray-400">{b.car.plate}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{b.user.name}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {fmtDateWIB(b.startTime, { weekday:"short", day:"numeric", month:"short", year:"numeric" })}
                        </td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap font-medium">{getSlotLabel(b.startTime)}</td>
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {fmtTimeWIB(b.startTime)} – {fmtTimeWIB(b.endTime)}
                        </td>
                        <td className="px-4 py-3">
                          <Link href={`/bookings/${b.id}`} className="text-blue-600 hover:underline text-xs">Detail</Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            {data?.pages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm">
                <span className="text-gray-500">Halaman {data.page} dari {data.pages} · {data.total} total</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1}
                    className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Sebelumnya</button>
                  {Array.from({length: data.pages}, (_,i) => i+1).map(p => (
                    <button key={p} onClick={() => setPage(p)}
                      className={`px-3 py-1 rounded border transition-colors ${p===page ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 hover:bg-gray-50"}`}>
                      {p}
                    </button>
                  ))}
                  <button onClick={() => setPage(p => Math.min(data.pages, p+1))} disabled={page===data.pages}
                    className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Berikutnya</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
