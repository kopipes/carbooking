"use client";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, useCallback, useRef } from "react";
import { toWIBDateStr, wibToUTC, fmtWIB, wibHourFloat } from "@/lib/wib";

interface TooltipData {
  booking: any;
  x: number;
  y: number;
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
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const handleBookingClick = useCallback((id: number) => {
    router.push(`/bookings/${id}`);
  }, [router]);

  function showTooltip(booking: any, e: React.MouseEvent) {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const scrollY = window.scrollY;
    setTooltip({ booking, x: rect.right + 8, y: rect.top + scrollY });
  }

  function hideTooltip() {
    tooltipTimer.current = setTimeout(() => setTooltip(null), 150);
  }

  function keepTooltip() {
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Kalender</h1>
        <div className="flex items-center gap-2">
          <button onClick={prevWeek} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">&#8249; Prev</button>
          <button onClick={goToday}  className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">Hari ini</button>
          <button onClick={nextWeek} className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm hover:bg-gray-50">Next &#8250;</button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-500 inline-block" /> Terboking — klik untuk detail</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" /> Hover — klik untuk booking</span>
        <span className="text-gray-400">Semua waktu dalam WIB</span>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Week label */}
        <div className="px-4 py-2.5 border-b border-gray-100 text-sm font-semibold text-gray-700">
          {(() => {
            const s = fromStr.split("-"); const e = toStr.split("-");
            return `${parseInt(s[2])} ${MONTHS_ID[parseInt(s[1])-1]} – ${parseInt(e[2])} ${MONTHS_ID[parseInt(e[1])-1]} ${e[0]}`;
          })()}
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
                          onClick={e => {
                            e.stopPropagation();
                            // Click on booking block → open new booking at same time
                            const dateStr = toWIBDateStr(new Date(b.raw.startTime));
                            const startH = Math.floor(b.startH);
                            const startM = Math.round((b.startH % 1) * 60);
                            router.push(`/bookings/new?date=${dateStr}&customStart=${toHM(startH, startM)}&customEnd=${toHM(Math.floor(b.endH), Math.round((b.endH % 1) * 60))}`);
                          }}
                          onMouseEnter={e => { e.stopPropagation(); showTooltip(b.raw, e); }}
                          onMouseLeave={e => { e.stopPropagation(); hideTooltip(); }}
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

      {/* Hover tooltip modal */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl p-4 w-72 pointer-events-auto"
          style={{ left: Math.min(tooltip.x, window.innerWidth - 300), top: tooltip.y }}
          onMouseEnter={keepTooltip}
          onMouseLeave={hideTooltip}
        >
          <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-1">{tooltip.booking.title}</h3>
          {tooltip.booking.description && (
            <p className="text-xs text-gray-500 mb-3">{tooltip.booking.description}</p>
          )}
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-16">Kendaraan</span>
              <span className="font-medium text-gray-700">{tooltip.booking.car?.name} <span className="text-gray-400">({tooltip.booking.car?.plate})</span></span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-16">Dipesan</span>
              <span className="font-medium text-gray-700">{tooltip.booking.user?.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-16">Mulai</span>
              <span className="font-medium text-gray-700">
                {fmtWIB(tooltip.booking.startTime, { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })} WIB
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-16">Selesai</span>
              <span className="font-medium text-gray-700">
                {fmtWIB(tooltip.booking.endTime, { hour:"2-digit", minute:"2-digit" })} WIB
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-400 w-16">Durasi</span>
              <span className="font-medium text-gray-700">
                {tooltip.booking.durationMin >= 60
                  ? `${Math.floor(tooltip.booking.durationMin/60)} jam${tooltip.booking.durationMin%60>0 ? ` ${tooltip.booking.durationMin%60} mnt` : ""}`
                  : `${tooltip.booking.durationMin} menit`}
              </span>
            </div>
            {tooltip.booking.driver && (
              <div className="flex items-start gap-2 pt-1.5 mt-1.5 border-t border-gray-100">
                <span className="text-gray-400 w-16">Driver</span>
                <div>
                  <span className="font-medium text-green-700">{tooltip.booking.driver.name}</span>
                  {tooltip.booking.driver.phone && (
                    <span className="text-gray-400 ml-1">{tooltip.booking.driver.phone}</span>
                  )}
                </div>
              </div>
            )}
            {!tooltip.booking.driver && (
              <div className="flex items-center gap-2 pt-1.5 mt-1.5 border-t border-gray-100">
                <span className="text-gray-400 w-16">Driver</span>
                <span className="text-yellow-600 text-xs">Belum ditugaskan</span>
              </div>
            )}
          </div>
          <button
            onClick={() => { setTooltip(null); handleBookingClick(tooltip.booking.id); }}
            className="mt-3 w-full bg-blue-600 text-white py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors"
          >
            Lihat Detail
          </button>
        </div>
      )}
    </div>
  );
}
