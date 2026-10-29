import { fmtDateWIB, fmtTimeWIB } from "@/lib/wib";

export type NotificationKind = "created" | "updated" | "cancelled";

const ACTION_BASE = (process.env.APP_BASE_URL || "https://book.provaliantgroup.com").replace(/\/+$/, "");

function appUrl(path: string): string {
  return `${ACTION_BASE}${path}`;
}

function dateLine(start: Date, end: Date): string {
  const date = fmtDateWIB(start, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return `${date}\nJam: ${fmtTimeWIB(start)} – ${fmtTimeWIB(end)} WIB`;
}

const KIND_PREFIX: Record<NotificationKind, string> = {
  created: "",
  updated: "Perubahan jadwal: ",
  cancelled: "Dibatalkan: ",
};

/** Build the email fallback (used when Notiv cannot reach a recipient). */
export function notificationEmail(payload: {
  title: string;
  message: string;
  action_url?: string;
}): { subject: string; text: string } {
  const lines = [payload.message];
  if (payload.action_url) lines.push("", `Lihat detail: ${payload.action_url}`);
  return { subject: payload.title, text: lines.join("\n") };
}

export interface VehicleNotificationInput {
  id: number;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  car: { name: string; plate: string };
  driver?: { name: string; phone?: string | null } | null;
}

export function vehicleNotification(booking: VehicleNotificationInput, kind: NotificationKind) {
  const lines = [
    `Keperluan: ${booking.title}`,
    dateLine(booking.startTime, booking.endTime),
    `Kendaraan: ${booking.car.name} (${booking.car.plate})`,
  ];
  if (booking.driver) {
    lines.push(
      `Driver: ${booking.driver.name}${booking.driver.phone ? ` · ${booking.driver.phone}` : ""}`
    );
  }
  if (booking.description) lines.push(`Keterangan: ${booking.description}`);

  return {
    type: "booking",
    title: `${KIND_PREFIX[kind]}Booking Kendaraan: ${booking.title}`,
    message: lines.join("\n"),
    // A cancelled booking no longer has a detail page, so don't link to it.
    action_url: kind === "cancelled" ? undefined : appUrl(`/bookings/${booking.id}`),
  };
}

export interface MeetingNotificationInput {
  id: number;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  meetingRoom: { name: string };
  participants: { name: string }[];
}

export function meetingNotification(booking: MeetingNotificationInput, kind: NotificationKind) {
  const lines = [
    `Keperluan: ${booking.title}`,
    dateLine(booking.startTime, booking.endTime),
    `Ruangan: ${booking.meetingRoom.name}`,
    `Peserta: ${
      booking.participants.length > 0
        ? booking.participants.map(p => p.name).join(", ")
        : "Belum ada peserta"
    }`,
  ];
  if (booking.description) lines.push(`Keterangan: ${booking.description}`);

  return {
    type: "meeting",
    title: `${KIND_PREFIX[kind]}Rapat Ruangan: ${booking.title}`,
    message: lines.join("\n"),
    // A cancelled booking no longer has a detail page, so don't link to it.
    action_url: kind === "cancelled" ? undefined : appUrl(`/meeting-bookings/${booking.id}`),
  };
}
