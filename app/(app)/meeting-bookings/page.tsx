"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { fmtDateWIB, fmtTimeWIB } from "@/lib/wib";
import { useDebounce } from "@/lib/useDebounce";

type Tab = "upcoming" | "past";

export default function MeetingBookingsPage() {
  const [tab, setTab]       = useState<Tab>("upcoming");
  const [page, setPage]     = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch     = useDebounce(search, 300);
  const { data: session }   = useSession();
  const isUser              = session?.user?.role === "USER";

  const { data, isLoading } = useQuery({
    queryKey: ["meeting-bookings", debouncedSearch, isUser],
    queryFn: async () => {
      const params = new URLSearchParams({ page: "1", limit: "500" });
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (isUser) params.set("mine", "1");
      const res = await fetch(`/api/meeting-bookings?${params}`);
      return res.json();
    },
    enabled: session !== undefined,
  });

  function handleSearch(val: string) { setSearch(val); setPage(1); }
  function handleTabChange(t: Tab) { setTab(t); setPage(1); }

  const now = new Date();
  const allBookings: any[] = data?.bookings ?? [];

  const upcoming = allBookings
    .filter(b => new Date(b.endTime) >= now)
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const past = allBookings
    .filter(b => new Date(b.endTime) < now)
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

  const activeList = tab === "upcoming" ? upcoming : past;

  const LIMIT    = 10;
  const total    = activeList.length;
  const pages    = Math.max(1, Math.ceil(total / LIMIT));
  const safePage = Math.min(page, pages);
  const bookings = activeList.slice((safePage - 1) * LIMIT, safePage * LIMIT);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Meeting Room</h1>
        <Link href="/meeting-bookings/new"
          className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors">
          + Booking Ruangan
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => handleTabChange("upcoming")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === "upcoming"
              ? "bg-white text-purple-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Mendatang
          {!isLoading && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              tab === "upcoming" ? "bg-purple-100 text-purple-600" : "bg-gray-200 text-gray-500"
            }`}>{upcoming.length}</span>
          )}
        </button>
        <button
          onClick={() => handleTabChange("past")}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
            tab === "past"
              ? "bg-white text-gray-700 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Sudah Lewat
          {!isLoading && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              tab === "past" ? "bg-gray-200 text-gray-600" : "bg-gray-200 text-gray-500"
            }`}>{past.length}</span>
          )}
        </button>
      </div>

      {/* Search */}
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
          {debouncedSearch
            ? `Tidak ada hasil untuk "${debouncedSearch}"`
            : tab === "upcoming" ? "Tidak ada booking mendatang" : "Tidak ada booking yang sudah lewat"}
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {bookings.map((b: any) => (
              <Link key={b.id} href={`/meeting-bookings/${b.id}`}
                className={`block bg-white rounded-xl border shadow-sm p-4 transition-colors ${
                  tab === "past" ? "border-gray-200 opacity-75 hover:border-gray-300" : "border-gray-200 hover:border-purple-300"
                }`}>
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
                  <tr key={b.id} className={`transition-colors ${tab === "past" ? "hover:bg-gray-50 opacity-75" : "hover:bg-gray-50"}`}>
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
          {pages > 1 && (
            <div className="flex items-center justify-between text-sm text-gray-500 pt-1">
              <span className="text-xs">Halaman {safePage}/{pages} · {total} total</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 text-xs">‹</button>
                {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                  let start = Math.max(1, safePage - 2);
                  let end   = Math.min(pages, start + 4);
                  start = Math.max(1, end - 4);
                  return start + i;
                }).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-3 py-1 rounded border text-xs transition-colors ${p===safePage ? "bg-purple-600 text-white border-purple-600" : "border-gray-200 hover:bg-gray-50"}`}>{p}</button>
                ))}
                <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={safePage === pages}
                  className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 text-xs">›</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
