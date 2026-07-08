// WIB = UTC+7
export const TZ_OFFSET_H = 7;
export const TZ_OFFSET_MS = TZ_OFFSET_H * 3600000;

/** Convert a UTC Date to WIB date string YYYY-MM-DD */
export function toWIBDateStr(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return new Date(dt.getTime() + TZ_OFFSET_MS).toISOString().split("T")[0];
}

/** Convert WIB date string + WIB time string "HH:MM" to UTC Date */
export function wibToUTC(dateStr: string, timeStr: string): Date {
  const [y, mo, dy] = dateStr.split("-").map(Number);
  const [h, m] = timeStr.split(":").map(Number);
  return new Date(Date.UTC(y, mo - 1, dy, h - TZ_OFFSET_H, m));
}

/** Get WIB time string "HH:MM" from a UTC date/string */
export function toWIBTimeStr(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  const wib = new Date(dt.getTime() + TZ_OFFSET_MS);
  return `${String(wib.getUTCHours()).padStart(2, "0")}:${String(wib.getUTCMinutes()).padStart(2, "0")}`;
}

/** Format a UTC date/string as WIB locale string */
export function fmtWIB(d: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", ...opts });
}

/** Format just the time part in WIB */
export function fmtTimeWIB(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
}

/** Format just the date part in WIB */
export function fmtDateWIB(d: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", ...opts });
}

/** Today's date string in WIB YYYY-MM-DD */
export function todayWIB(): string {
  return toWIBDateStr(new Date());
}

/** WIB float hour (e.g. 9.5 = 09:30) from a UTC date string */
export function wibHourFloat(d: Date | string): number {
  const dt = typeof d === "string" ? new Date(d) : d;
  const wib = new Date(dt.getTime() + TZ_OFFSET_MS);
  return wib.getUTCHours() + wib.getUTCMinutes() / 60;
}

// Shared time slots definition — single source of truth
export const TIME_SLOTS = [
  { label: "Pagi",  emoji: "🌅", start: "07:00", end: "12:00", startH: 7,  endH: 12 },
  { label: "Siang", emoji: "☀️", start: "12:00", end: "15:00", startH: 12, endH: 15 },
  { label: "Sore",  emoji: "🌤️", start: "15:00", end: "18:00", startH: 15, endH: 18 },
  { label: "Malam", emoji: "🌙", start: "18:00", end: "22:00", startH: 18, endH: 22 },
] as const;

/** Get slot label for a UTC date string based on WIB hour range */
export function getSlotLabel(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  const wib = new Date(dt.getTime() + TZ_OFFSET_MS);
  const h = wib.getUTCHours();
  const m = wib.getUTCMinutes();
  const totalMin = h * 60 + m;
  const slot = TIME_SLOTS.find(s => {
    const [sh, sm] = s.start.split(":").map(Number);
    const [eh, em] = s.end.split(":").map(Number);
    return totalMin >= sh * 60 + sm && totalMin < eh * 60 + em;
  });
  return slot ? `${slot.emoji} ${slot.label}` : "⏰ Custom";
}
