"use client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { toWIBDateStr, wibToUTC, fmtWIB, wibHourFloat } from "@/lib/wib";

interface TooltipData {
  booking: any;
}

const HOUR_START = 7;   // 07:00 WIB
const HOUR_END   = 22;  // 22:00 WIB
const HOURS      = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
const ROW_H      = 48;  // px per hour

const DAYS_ID   = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
const MONTHS_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function getWeekDays(base: Date): Date[] {
  const wib  = new Date(base.getTime() + 7 * 3600000);
  const day  = wib.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon  = new Date(wib);
  mon.setUTCDate(wib.getUTCDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setUTCDate(mon.getUTCDate() + i);
    return d;
  });
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function toHM(h: number, m = 0) { return `${pad(h)}:${pad(m)}`; }

// Get WIB hour (float) from a UTC date string - uses shared utility
function wibHourOf(utcStr: string): number {
  return wibHourFloat(utcStr);
}

interface BookingBlock {
  id: number;
  title: string;
  carName: string;
  userName: string;
  startH: number;
  endH: number;
  col: number;
  cols: number;
  raw: any; // original booking object
}

// Given bookings for a day, assign overlap columns
function layoutBookings(dayBookings: any[]): BookingBlock[] {
  const blocks: BookingBlock[] = dayBookings.map(b => ({
    id: b.id,
    title: b.title,
    carName: b.car?.name ?? "",
    userName: b.user?.name ?? "",
    startH: wibHourOf(b.startTime),
    endH: wibHourOf(b.endTime),
    col: 0,
    cols: 1,
    raw: b,
  }));

  // Sort by start
  blocks.sort((a, b) => a.startH - b.startH);

  // Greedy column assignment
  const colEnds: number[] = [];
  blocks.forEach(b => {
    let col = colEnds.findIndex(e => e <= b.startH);
    if (col === -1) col = colEnds.length;
    colEnds[col] = b.endH;
    b.col = col;
  });

  const maxCols = colEnds.length;
  blocks.forEach(b => { b.cols = maxCols; });
  return blocks;
}

export default function CalendarPage() {
  const router  = useRouter();
  const [base, setBase]       = useState(new Date());
  const [hovered, setHovered] = useState<{ date: string; hour: number } | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);

  const weekDays = getWeekDays(base);
  const fromStr  = toWIBDateStr(weekDays[0]);
  const toStr    = toWIBDateStr(weekDays[6]);
  const todayStr = toWIBDateStr(new Date());

  const { data: bookings } = useQuery({
    queryKey: ["calendar-bookings", fromStr, toStr],
    queryFn: async () => {
      // Fetch bookings filtered to the displayed week only
      const startUTC = wibToUTC(fromStr, "00:00").toISOString();
      const endUTC   = wibToUTC(toStr,   "23:59").toISOString();
      const params   = new URLSearchParams({ limit: "200", page: "1" });
      const [bookingRes, assignRes] = await Promise.all([
        fetch(`/api/bookings?${params}`),
        fetch(`/api/assignments?date=${fromStr}`), // get all for week by fetching each day
      ]);
      const bookingList: any[] = (await bookingRes.json()).bookings ?? [];

      // Fetch all 7 days assignments in one parallel batch
      const dayStrs = Array.from({ length: 7 }, (_, i) =>
        toWIBDateStr(new Date(wibToUTC(fromStr, "00:00").getTime() + i * 86400000))
      );
      const assignResults = await Promise.all(
        dayStrs.map(ds => fetch(`/api/assignments?date=${ds}`).then(r => r.json()))
      );

      // Build map: "carId_date" -> driver
      const driverMap = new Map<string, any>();
      assignResults.flat().forEach((a: any) => {
        driverMap.set(`${a.carId}_${a.date}`, a.driver);
      });

      // Filter to current week and attach driver
      return bookingList
        .filter(b => {
          const ds = toWIBDateStr(b.startTime);
          return ds >= fromStr && ds <= toStr;
        })
        .map(b => ({
          ...b,
          driver: driverMap.get(`${b.carId}_${toWIBDateStr(b.startTime)}`) ?? null,
        }));
    },
  });

  // Group by WIB date string
  const byDate: Record<string, any[]> = {};
  (bookings ?? []).forEach((b: any) => {
    const ds = toWIBDateStr(b.startTime);
    if (!byDate[ds]) byDate[ds] = [];
    byDate[ds].push(b);
  });

  const nowWIBH = wibHourOf(new Date().toISOString());
  const nowDate = toWIBDateStr(new Date());

  function prevWeek() { const d = new Date(base); d.setDate(d.getDate() - 7); setBase(d); }
  function nextWeek() { const d = new Date(base); d.setDate(d.getDate() + 7); setBase(d); }
  function goToday()  { setBase(new Date()); }

  const handleCellClick = useCallback((dateStr: string, hour: number) => {
    const endHour = Math.min(hour + 1, HOUR_END);
    router.push(`/bookings/new?date=${dateStr}&customStart=${toHM(hour)}&customEnd=${toHM(endHour)}`);
  }, [router]);

  function openModal(booking: any) { setTooltip({ booking }); }
  function closeModal() { setTooltip(null); }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Kalender</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {(() => {
              const s = fromStr.split("-"); const e = toStr.split("-");
              const startMonth = MONTHS_ID[parseInt(s[1]) - 1];
              const endMonth   = MONTHS_ID[parseInt(e[1]) - 1];
              const year       = e[0];
              return startMonth === endMonth
                ? `${startMonth} ${year}`
                : `${startMonth} – ${endMonth} ${year}`;
            })()}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {/* Month & Year picker */}
          <select
            value={`${toWIBDateStr(base).split("-")[0]}-${toWIBDateStr(base).split("-")[1]}`}
            onChange={e => {
              const [y, m] = e.target.value.split("-").map(Number);
              const d = new Date(base);
              d.setFullYear(y);
              d.setMonth(m - 1);
              d.setDate(1);
              setBase(d);
            }}
            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(() => {
              const opts = [];
              const now = new Date();
              // Show 6 months back and 12 months ahead
              for (let i = -6; i <= 12; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, "0");
                opts.push(
                  <option key={`${y}-${m}`} value={`${y}-${m}`}>
                    {MONTHS_ID[d.getMonth()]} {y}
                  </option>
                );
              }
              return opts;
            })()}
          </select>
          <button onClick={prevWeek} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">&#8249;</button>
          <button onClick={goToday}  className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">Hari ini</button>
          <button onClick={nextWeek} className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">&#8250;</button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Terboking — klik untuk pilihan</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" /> Klik untuk booking baru</span>
        <span className="text-gray-400">WIB</span>
      </div>

      {/* Mobile day strip */}
      <div className="md:hidden flex gap-1 overflow-x-auto pb-1 -mx-1 px-1">
        {weekDays.map(d => {
          const ds = toWIBDateStr(d);
          const parts = ds.split("-").map(Number);
          const dayOfWeek = new Date(Date.UTC(parts[0], parts[1]-1, parts[2])).getUTCDay();
          const isToday = ds === todayStr;
          const hasBookings = (byDate[ds] ?? []).length > 0;
          return (
            <a key={ds} href={`#day-${ds}`}
              className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-xl border transition-colors text-xs
                ${isToday ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"}`}>
              <span className="font-medium">{DAYS_ID[dayOfWeek]}</span>
              <span className={`text-sm font-bold ${isToday ? "text-white" : "text-gray-800"}`}>{parts[2]}</span>
              {hasBookings && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isToday ? "bg-white" : "bg-blue-500"}`} />}
            </a>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Week label */}
        <div className="px-4 py-2.5 border-b border-gray-100 text-sm font-semibold text-gray-700">
          {(() => {
            const s = fromStr.split("-"); const e = toStr.split("-");
            return `${parseInt(s[2])} ${MONTHS_ID[parseInt(s[1])-1]} – ${parseInt(e[2])} ${MONTHS_ID[parseInt(e[1])-1]} ${e[0]}`;
          })()}
          <span className="ml-2 text-xs text-gray-400 font-normal md:hidden">← geser →</span>
        </div>

        <div className="overflow-x-auto">
          <div className="flex min-w-[700px]">

            {/* Time gutter */}
            <div className="w-14 shrink-0 border-r border-gray-100">
              {/* Header spacer */}
              <div className="h-12 border-b border-gray-100" />
              {HOURS.map(h => (
                <div key={h} style={{ height: ROW_H }}
                  className="border-b border-gray-100 flex items-start justify-end pr-2 pt-1">
                  <span className="text-xs text-gray-400">{toHM(h)}</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map(d => {
              const ds      = toWIBDateStr(d);
              const isToday = ds === todayStr;
              const parts   = ds.split("-").map(Number);
              const dayOfWeek = new Date(Date.UTC(parts[0], parts[1]-1, parts[2])).getUTCDay();
              const blocks  = layoutBookings(byDate[ds] ?? []);

              return (
                <div key={ds} className={`flex-1 min-w-[80px] border-r border-gray-100 last:border-r-0 ${isToday ? "bg-blue-50/30" : ""}`}>
                  {/* Day header */}
                  <div className={`h-12 border-b border-gray-100 flex flex-col items-center justify-center ${isToday ? "bg-blue-50" : ""}`}>
                    <span className={`text-xs font-semibold ${isToday ? "text-blue-600" : "text-gray-500"}`}>{DAYS_ID[dayOfWeek]}</span>
                    <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                      ${isToday ? "bg-blue-600 text-white" : "text-gray-800"}`}>
                      {parts[2]}
                    </span>
                  </div>

                  {/* Hourly grid — relative container */}
                  <div
                    className="relative"
                    style={{ height: HOURS.length * ROW_H }}
                    onMouseMove={e => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const h = Math.floor(y / ROW_H) + HOUR_START;
                      const isPast = (ds < nowDate) || (ds === nowDate && h + 1 <= nowWIBH);
                      if (!isPast && h >= HOUR_START && h < HOUR_END) {
                        setHovered({ date: ds, hour: h });
                      }
                    }}
                    onMouseLeave={() => setHovered(null)}
                    onClick={e => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const h = Math.floor(y / ROW_H) + HOUR_START;
                      const isPast = (ds < nowDate) || (ds === nowDate && h + 1 <= nowWIBH);
                      if (!isPast) handleCellClick(ds, h);
                    }}
                  >
                    {/* Hour cell backgrounds */}
                    {HOURS.map(h => {
                      const isPast = (ds < nowDate) || (ds === nowDate && h + 1 <= nowWIBH);
                      const isHov  = hovered?.date === ds && hovered?.hour === h;
                      return (
                        <div
                          key={h}
                          style={{ top: (h - HOUR_START) * ROW_H, height: ROW_H, zIndex: 1 }}
                          className={`absolute w-full border-b border-gray-100 transition-colors pointer-events-none
                            ${isPast ? "bg-gray-50/60" : ""}
                            ${!isPast && isHov ? "bg-blue-50/60" : ""}
                          `}
                        >
                          {/* Current time line */}
                          {isToday && Math.floor(nowWIBH) === h && (
                            <div
                              className="absolute left-0 right-0 border-t-2 border-red-400 z-20 pointer-events-none"
                              style={{ top: (nowWIBH - h) * ROW_H }}
                            >
                              <div className="w-2 h-2 rounded-full bg-red-400 -mt-1 -ml-1" />
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Booking blocks */}
                    {blocks.map(b => {
                      const clampedStart = Math.max(b.startH, HOUR_START);
                      const clampedEnd   = Math.min(b.endH,   HOUR_END);
                      if (clampedEnd <= clampedStart) return null;
                      const top    = (clampedStart - HOUR_START) * ROW_H;
                      const height = Math.max((clampedEnd - clampedStart) * ROW_H - 2, 20);
                      const width  = `calc(${100 / b.cols}% - 4px)`;
                      const left   = `calc(${(b.col / b.cols) * 100}% + 2px)`;
                      return (
                        <div
                          key={b.id}
                          style={{ top, height, width, left, position: "absolute", zIndex: 10 }}
                          onClick={e => { e.stopPropagation(); openModal(b.raw); }}
                          className="rounded-md bg-blue-500 border border-blue-600 text-white px-1.5 py-1 cursor-pointer
                            hover:bg-blue-600 hover:shadow-md transition-all overflow-hidden"
                        >
                          <div className="text-xs font-semibold truncate leading-tight">{b.carName}</div>
                          <div className="text-xs opacity-80 truncate leading-tight">{b.title}</div>
                          {height >= 36 && (
                            <div className="text-xs opacity-70 truncate leading-tight">
                              {toHM(Math.floor(b.startH), Math.round((b.startH % 1) * 60))}–{toHM(Math.floor(b.endH), Math.round((b.endH % 1) * 60))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Hover pill — always on top, pointer-events-none */}
                    {hovered?.date === ds && (() => {
                      const h = hovered.hour;
                      const isPast = (ds < nowDate) || (ds === nowDate && h + 1 <= nowWIBH);
                      if (isPast) return null;
                      return (
                        <div
                          style={{ top: (h - HOUR_START) * ROW_H, height: ROW_H, zIndex: 30 }}
                          className="absolute w-full pointer-events-none flex items-end justify-center pb-1"
                        >
                          <span className="text-xs text-blue-700 font-semibold bg-white border border-blue-400 px-2 py-0.5 rounded-full shadow-md">
                            + {toHM(h)}–{toHM(h + 1)} WIB
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Booking info modal — centered, two action buttons */}
      {tooltip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto"
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800 text-base leading-tight">{tooltip.booking.title}</h3>
                {tooltip.booking.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{tooltip.booking.description}</p>
                )}
              </div>
              <button onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 transition-colors shrink-0 mt-0.5">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Booking info */}
            <div className="px-5 py-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16 shrink-0">Kendaraan</span>
                <span className="font-medium text-gray-700">{tooltip.booking.car?.name}
                  <span className="text-gray-400 font-normal"> · {tooltip.booking.car?.plate}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16 shrink-0">Pemesan</span>
                <span className="font-medium text-gray-700">{tooltip.booking.user?.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16 shrink-0">Mulai</span>
                <span className="font-medium text-gray-700">
                  {fmtWIB(tooltip.booking.startTime, { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })} WIB
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16 shrink-0">Selesai</span>
                <span className="font-medium text-gray-700">
                  {fmtWIB(tooltip.booking.endTime, { hour:"2-digit", minute:"2-digit" })} WIB
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-16 shrink-0">Durasi</span>
                <span className="font-medium text-gray-700">
                  {tooltip.booking.durationMin >= 60
                    ? `${Math.floor(tooltip.booking.durationMin/60)} jam${tooltip.booking.durationMin%60>0 ? ` ${tooltip.booking.durationMin%60} mnt` : ""}`
                    : `${tooltip.booking.durationMin} menit`}
                </span>
              </div>
              <div className="flex items-start gap-2 pt-2 mt-1 border-t border-gray-100">
                <span className="text-gray-400 w-16 shrink-0">Driver</span>
                {tooltip.booking.driver ? (
                  <div>
                    <span className="font-medium text-green-700">{tooltip.booking.driver.name}</span>
                    {tooltip.booking.driver.phone && (
                      <span className="text-gray-400 text-xs ml-1">· {tooltip.booking.driver.phone}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-yellow-600 text-xs bg-yellow-50 px-2 py-0.5 rounded-full">Belum ditugaskan</span>
                )}
              </div>
            </div>

            {/* Two action buttons */}
            <div className="px-5 pb-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  closeModal();
                  const b = tooltip.booking;
                  const startH = wibHourOf(b.startTime);
                  const endH   = wibHourOf(b.endTime);
                  const dateStr = toWIBDateStr(b.startTime);
                  router.push(`/bookings/new?date=${dateStr}&customStart=${toHM(Math.floor(startH), Math.round((startH%1)*60))}&customEnd=${toHM(Math.floor(endH), Math.round((endH%1)*60))}`);
                }}
                className="flex flex-col items-center gap-1 bg-blue-50 border-2 border-blue-200 text-blue-700 py-3 rounded-xl text-sm font-medium hover:bg-blue-100 hover:border-blue-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Booking di Jam Ini
              </button>
              <button
                onClick={() => { closeModal(); router.push(`/bookings/${tooltip.booking.id}`); }}
                className="flex flex-col items-center gap-1 bg-gray-50 border-2 border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-medium hover:bg-gray-100 hover:border-gray-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Lihat Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
