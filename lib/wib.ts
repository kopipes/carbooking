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

/** Format a UTC date/string as WIB locale string */
export function fmtWIB(d: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta",
    ...opts,
  });
}

/** Format just the time part in WIB */
export function fmtTimeWIB(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleTimeString("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Format just the date part in WIB */
export function fmtDateWIB(d: Date | string, opts?: Intl.DateTimeFormatOptions): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("id-ID", {
    timeZone: "Asia/Jakarta",
    ...opts,
  });
}

/** Today's date string in WIB YYYY-MM-DD */
export function todayWIB(): string {
  return toWIBDateStr(new Date());
}

/** Build ISO string from WIB date + time strings, as if timezone is Asia/Jakarta */
export function wibDateTimeToISO(dateStr: string, timeStr: string): string {
  return wibToUTC(dateStr, timeStr).toISOString();
}
