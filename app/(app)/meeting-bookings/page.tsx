"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { fmtDateWIB, fmtTimeWIB } from "@/lib/wib";
import { useDebounce } from "@/lib/useDebounce";

export default function MeetingBookingsPage() {
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch     = useDebounce(search, 300);
  const { data: session }   = useSession();
  const isUser              = session?.user?.role === "USER";

  const { data, isLoading } = useQuery({
    queryKey: ["meeting-bookings", page, debouncedSearch, isUser],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (isUser) params.set("mine", "1");
      const res = await fetch(`/api/meeting-bookings?${params}`);
      return res.json();
    },
    enabled: session !== undefined,
  });

  function handleSearch(val: string) { setSearch(val); setPage(1); }
  const bookings = data?.bookings ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Booking Meeting Room</h1>
        <Link href="/meeting-bookings/new"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          + Booking Ruangan
        </Link>
      </div>

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input type="text" value={search} onChange={e => handleSearch(e.target.value)}
          placeholder="Cari keperluan, ruangan, nama pemesan..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
        {search && (
          <button onClick={() => handleSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">✕</button>
        )}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">Memuat...</div>
      ) : bookings.length === 0 ? (
        <div className="py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-200">
          {debouncedSearch ? `Tidak ada hasil untuk "${debouncedSearch}"` : "Belum ada booking meeting room"}
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {bookings.map((b: any) => (
              <Link key={b.id} href={`/meeting-bookings/${b.id}`}
                className="block bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-purple-300 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-semibold text-gray-800 text-sm leading-tight">{b.title}</p>
                  <span className="text-xs text-purple-600 shrink-0">Detail →</span>
                </div>
                <div className="space-y-1 text-xs text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">Tanggal:</span>
                    <span>{fmtDateWIB(b.startTime, { weekday:"short", day:"numeric", month:"short" })}</span>
                    <span className="text-gray-300">·</span>
                    <span>{fmtTimeWIB(b.startTime)} – {fmtTimeWIB(b.endTime)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">Ruangan:</span>
                    <span className="font-medium text-gray-700">{b.meetingRoom.name}</span>
                    <span className="text-gray-300">·</span>
                    <span>{b.meetingRoom.capacity} orang</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-gray-400">Pemesan:</span>
                    <span>{b.user.name}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Keperluan</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Ruangan</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Pemesan</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Waktu Mulai</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Selesai</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bookings.map((b: any) => (
                  <tr key={b.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-48 truncate">{b.title}</td>
                    <td className="px-4 py-3 text-gray-700">{b.meetingRoom.name}</td>
                    <td className="px-4 py-3 text-gray-600">{b.user.name}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {fmtDateWIB(b.startTime, { day:"numeric", month:"short" })} {fmtTimeWIB(b.startTime)}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtTimeWIB(b.endTime)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/meeting-bookings/${b.id}`} className="text-purple-600 hover:underline text-xs">Detail</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data?.pages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500 pt-1">
              <span>Total {data.total} booking</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 text-xs">‹</button>
                {Array.from({ length: Math.min(5, data.pages) }, (_, i) => {
                  const total = data.pages;
                  let start = Math.max(1, page - 2);
                  let end   = Math.min(total, start + 4);
                  start = Math.max(1, end - 4);
                  return start + i;
                }).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-3 py-1 rounded border text-xs transition-colors ${p===page ? "bg-purple-600 text-white border-purple-600" : "border-gray-200 hover:bg-gray-50"}`}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages}
                  className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 text-xs">›</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
