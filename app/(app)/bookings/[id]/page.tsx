"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { fmtWIB, fmtTimeWIB, toWIBDateStr } from "@/lib/wib";

const TIME_SLOTS = [
  { label: "Pagi",  emoji: "🌅", start: "07:00", end: "12:00" },
  { label: "Siang", emoji: "☀️", start: "12:00", end: "15:00" },
  { label: "Sore",  emoji: "🌤️", start: "15:00", end: "18:00" },
  { label: "Malam", emoji: "🌙", start: "18:00", end: "22:00" },
];

function getSlot(startTime: string) {
  const wibHour = new Date(new Date(startTime).getTime() + 7 * 3600000).getUTCHours();
  const wibMin  = new Date(new Date(startTime).getTime() + 7 * 3600000).getUTCMinutes();
  const hm = `${String(wibHour).padStart(2,"0")}:${String(wibMin).padStart(2,"0")}`;
  return TIME_SLOTS.find(s => s.start === hm) ?? null;
}

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const qc = useQueryClient();
  const role   = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bookings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bookings"] });
      router.push("/bookings");
    },
  });

  if (isLoading) return <div className="py-16 text-center text-gray-400">Memuat...</div>;
  if (!booking)  return <div className="py-16 text-center text-gray-400">Booking tidak ditemukan</div>;

  const isOwner   = String(booking.userId) === String(userId);
  const canEdit   = isOwner || role === "ADMIN";
  const canDelete = isOwner || role === "ADMIN";
  const slot = getSlot(booking.startTime);

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <Link href="/bookings" className="text-gray-400 hover:text-gray-600 text-sm">← Kembali</Link>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-800">{booking.title}</h1>
          {booking.description && <p className="text-gray-500 text-sm mt-1">{booking.description}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Kendaraan</p>
            <p className="font-medium text-gray-800">{booking.car.name}</p>
            <p className="text-gray-500 text-xs">{booking.car.plate} · {booking.car.type}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Dipesan oleh</p>
            <p className="font-medium text-gray-800">{booking.user.name}</p>
            <p className="text-gray-500 text-xs">{booking.user.division?.name}</p>
          </div>
        </div>

        {/* Time info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-2 text-sm">
          {slot && (
            <div className="flex items-center gap-2 font-semibold text-blue-800">
              <span className="text-xl">{slot.emoji}</span>
              <span>{slot.label}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-gray-400">Mulai (WIB)</p>
              <p className="font-semibold text-gray-800">
                {fmtWIB(booking.startTime, { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Selesai (WIB)</p>
              <p className="font-semibold text-gray-800">
                {fmtWIB(booking.endTime, { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
              </p>
            </div>
          </div>
          <div>
            <span className="text-gray-400 text-xs">Durasi: </span>
            <span className="font-medium text-gray-700">
              {booking.durationMin >= 60
                ? `${Math.floor(booking.durationMin/60)} jam${booking.durationMin%60>0 ? ` ${booking.durationMin%60} menit` : ""}`
                : `${booking.durationMin} menit`}
            </span>
          </div>
        </div>

        {/* Driver info */}
        {booking.driver && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">Driver Ditugaskan</p>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-green-200 flex items-center justify-center text-green-700 font-bold text-sm">
                {booking.driver.name.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{booking.driver.name}</p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {booking.driver.phone && <span>{booking.driver.phone}</span>}
                  {booking.driver.license && <span>SIM: {booking.driver.license}</span>}
                </div>
              </div>
            </div>
          </div>
        )}
        {!booking.driver && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-700">
            Belum ada driver yang ditugaskan untuk kendaraan ini pada tanggal tersebut
          </div>
        )}

        {(canEdit || canDelete) && (
          <div className="pt-3 border-t border-gray-100 flex gap-3">
            {canEdit && (
              <Link
                href={`/bookings/${id}/edit`}
                className="flex-1 text-center bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Edit Booking
              </Link>
            )}
            {canDelete && (
              <button
                onClick={() => { if (confirm("Hapus booking ini?")) deleteMutation.mutate(); }}
                disabled={deleteMutation.isPending}
                className="flex-1 border border-red-300 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60"
              >
                {deleteMutation.isPending ? "Menghapus..." : "Hapus Booking"}
              </button>
            )}
          </div>
        )}
        {deleteMutation.isError && <p className="text-red-500 text-sm">Gagal menghapus. Coba lagi.</p>}
      </div>
    </div>
  );
}
