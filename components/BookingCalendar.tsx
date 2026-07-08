"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toWIBDateStr, todayWIB } from "@/lib/wib";

const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const DAYS   = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

interface Props {
  selectedDate: string;
  selectedSlot: number;
  onSelectDate: (date: string) => void;
  onSelectSlot: (slotIndex: number) => void;
}

export default function BookingCalendar({ selectedDate, onSelectDate }: Props) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1);
  const lastDay  = new Date(viewYear, viewMonth + 1, 0);
  const fromStr  = `${viewYear}-${String(viewMonth+1).padStart(2,"0")}-01`;
  const toStr    = toWIBDateStr(lastDay);

  // Fetch booking count per day to show dot indicators
  const { data } = useQuery({
    queryKey: ["availability", fromStr, toStr],
    queryFn: async () => {
      const res = await fetch(`/api/availability?from=${fromStr}&to=${toStr}`);
      return res.json();
    },
  });

  const avail = data?.availability ?? {};

  const startPad = firstDay.getDay();
  const cells: (Date | null)[] = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: lastDay.getDate() }, (_, i) => new Date(viewYear, viewMonth, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function dayDot(dateStr: string) {
    const dayAvail = avail[dateStr];
    if (!dayAvail) return null;
    const slots = Object.values(dayAvail) as { booked: number; total: number }[];
    if (!slots.length || slots[0].total === 0) return null;
    const allFull  = slots.every(s => s.booked >= s.total);
    const anyBooked = slots.some(s => s.booked > 0);
    if (allFull)   return "bg-red-400";
    if (anyBooked) return "bg-yellow-400";
    return "bg-green-400";
  }

  const todayStr = todayWIB();

  function isPast(d: Date) {
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    return ds < todayStr;
  }

  function dateStr(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Month nav */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 text-lg">&#8249;</button>
        <span className="font-semibold text-gray-800 text-sm">{MONTHS[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-600 text-lg">&#8250;</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAYS.map(d => <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>)}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 p-1">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} className="aspect-square" />;
          const ds         = dateStr(day);
          const isSelected = ds === selectedDate;
          const isToday    = ds === todayStr;
          const past       = isPast(day);
          const dot        = dayDot(ds);

          return (
            <button
              key={ds}
              type="button"
              disabled={past}
              onClick={() => onSelectDate(ds)}
              className={`aspect-square flex flex-col items-center justify-center gap-0.5 text-sm rounded-lg transition-colors
                ${isSelected ? "bg-blue-600 text-white font-bold" : ""}
                ${!isSelected && isToday ? "border-2 border-blue-400 font-semibold text-blue-600" : ""}
                ${!isSelected && !past ? "hover:bg-blue-50 text-gray-700" : ""}
                ${past ? "text-gray-300 cursor-not-allowed" : "cursor-pointer"}
              `}
            >
              <span>{day.getDate()}</span>
              {dot && !past && (
                <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : dot}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> Tersedia</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> Sebagian</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> Penuh</span>
      </div>
    </div>
  );
}
