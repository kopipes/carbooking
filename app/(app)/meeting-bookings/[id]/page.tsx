"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fmtWIB, getSlotLabel } from "@/lib/wib";

export default function MeetingBookingDetailPage() {
  const { id }            = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router            = useRouter();
  const qc                = useQueryClient();
  const role              = session?.user?.role;
  const userId            = session?.user?.id;
  const [notifFailed, setNotifFailed] = useState(0);

  useEffect(() => {
    const n = Number(new URLSearchParams(window.location.search).get("notifFailed"));
    if (Number.isFinite(n) && n > 0) setNotifFailed(n);
  }, []);

  const { data: booking, isLoading } = useQuery({
    queryKey: ["meeting-booking", id],
    queryFn: async () => {
      const res = await fetch(`/api/meeting-bookings/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/meeting-bookings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting-bookings"] });
      router.push("/meeting-bookings");
    },
  });

  if (isLoading) return <div className="py-16 text-center text-gray-400">Memuat...</div>;
  if (!booking)  return <div className="py-16 text-center text-gray-400">Booking tidak ditemukan</div>;

  const isOwner   = String(booking.userId) === String(userId);
  const canEdit   = isOwner || role === "ADMIN";
  const canDelete = isOwner || role === "ADMIN";
  const slotLabel = booking?.startTime ? getSlotLabel(booking.startTime) : null;

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <Link href="/meeting-bookings" className="text-gray-400 hover:text-gray-600 text-sm">← Kembali</Link>

      {notifFailed > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
          Booking tersimpan, tetapi {notifFailed} notifikasi gagal terkirim. Penerima
          kemungkinan belum terdaftar/terverifikasi atau belum terhubung ke Notiv.
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">Meeting Room</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">{booking.title}</h1>
          {booking.description && <p className="text-gray-500 text-sm mt-1">{booking.description}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Ruangan</p>
            <p className="font-medium text-gray-800">{booking.meetingRoom.name}</p>
            <p className="text-gray-500 text-xs">Kapasitas {booking.meetingRoom.capacity} orang</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Pemesan</p>
            <p className="font-medium text-gray-800">{booking.user.name}</p>
            <p className="text-gray-500 text-xs">{booking.user.division?.name}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Waktu Mulai</p>
            <p className="font-medium text-gray-800">
              {fmtWIB(booking.startTime, { weekday:"short", day:"numeric", month:"short", year:"numeric" })}
            </p>
            <p className="text-gray-500 text-xs">
              {fmtWIB(booking.startTime, { hour:"2-digit", minute:"2-digit" })} WIB
              {slotLabel && <span className="ml-1">{slotLabel}</span>}
            </p>
          </div>
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Waktu Selesai</p>
            <p className="font-medium text-gray-800">
              {fmtWIB(booking.endTime, { hour:"2-digit", minute:"2-digit" })} WIB
            </p>
            <p className="text-gray-500 text-xs">{booking.durationMin} menit</p>
          </div>
        </div>

        <div className="pt-3 border-t border-gray-100">
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-1.5">
            Peserta {booking.participants?.length ? `(${booking.participants.length})` : ""}
          </p>
          {booking.participants?.length ? (
            <div className="flex flex-wrap gap-1.5">
              {booking.participants.map((p: any) => (
                <span key={p.id}
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    p.userId == null
                      ? "bg-gray-50 text-gray-700 border-dashed border-gray-300"
                      : "bg-purple-50 text-purple-700 border-purple-200"
                  }`}>
                  {p.name}
                  {p.userId == null && <span className="ml-1 text-[10px] text-gray-400">eksternal</span>}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Belum ada peserta</p>
          )}
        </div>

        {(canEdit || canDelete) && (
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            {canEdit && (
              <Link href={`/meeting-bookings/${id}/edit`}
                className="flex-1 text-center bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                Edit Booking
              </Link>
            )}
            {canDelete && (
              <button
                onClick={() => { if (confirm("Hapus booking meeting room ini?")) deleteMutation.mutate(); }}
                disabled={deleteMutation.isPending}
                className="flex-1 border border-red-300 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-60">
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
