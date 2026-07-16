"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function EditMeetingBookingPage() {
  const { id }            = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router            = useRouter();
  const qc                = useQueryClient();

  const [form, setForm] = useState({
    title: "", description: "", meetingRoomId: "",
    date: "", startTime: "", endTime: "",
  });
  const [error, setError] = useState("");

  const { data: booking, isLoading } = useQuery({
    queryKey: ["meeting-booking", id],
    queryFn: async () => {
      const res = await fetch(`/api/meeting-bookings/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  useEffect(() => {
    if (!booking) return;
    const toWIBTime = (utc: string) => {
      const d = new Date(new Date(utc).getTime() + 7 * 3600000);
      return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
    };
    const toWIBDate = (utc: string) => {
      const d = new Date(new Date(utc).getTime() + 7 * 3600000);
      return d.toISOString().split("T")[0];
    };
    setForm({
      title:         booking.title,
      description:   booking.description ?? "",
      meetingRoomId: String(booking.meetingRoomId),
      date:          toWIBDate(booking.startTime),
      startTime:     toWIBTime(booking.startTime),
      endTime:       toWIBTime(booking.endTime),
    });
  }, [booking]);

  const durationMin = form.startTime && form.endTime
    ? (() => {
        const [sh, sm] = form.startTime.split(":").map(Number);
        const [eh, em] = form.endTime.split(":").map(Number);
        return (eh * 60 + em) - (sh * 60 + sm);
      })()
    : 0;

  const { data: rooms } = useQuery({
    queryKey: ["meeting-rooms-available-edit", form.date, form.startTime, form.endTime, id],
    enabled: !!form.date && !!form.startTime && !!form.endTime && durationMin > 0,
    queryFn: async () => {
      const params = new URLSearchParams({
        date: form.date, startTime: form.startTime, endTime: form.endTime,
      });
      const res = await fetch(`/api/meeting-rooms?${params}`);
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/meeting-bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title:         form.title,
          description:   form.description,
          meetingRoomId: form.meetingRoomId,
          date:          form.date,
          startSlot:     form.startTime,
          endSlot:       form.endTime,
          durationMin:   String(durationMin),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal menyimpan");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting-booking", id] });
      qc.invalidateQueries({ queryKey: ["meeting-bookings"] });
      router.push(`/meeting-bookings/${id}`);
    },
    onError: (e: any) => setError(e.message),
  });

  if (isLoading) return <div className="py-16 text-center text-gray-400">Memuat...</div>;

  const role = session?.user?.role;
  const isOwner = String(booking?.userId) === session?.user?.id;
  if (booking && role !== "ADMIN" && !isOwner) {
    return <div className="py-16 text-center text-gray-400">Tidak punya akses</div>;
  }

  const timeOptions: string[] = [];
  for (let h = 7; h <= 22; h++) {
    timeOptions.push(`${String(h).padStart(2,"0")}:00`);
    if (h < 22) timeOptions.push(`${String(h).padStart(2,"0")}:30`);
  }

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <Link href={`/meeting-bookings/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">← Kembali</Link>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h1 className="text-xl font-bold text-gray-800">Edit Booking Meeting Room</h1>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Keperluan / Judul *</label>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
          <textarea rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal *</label>
          <input type="date" value={form.date}
            onChange={e => setForm({ ...form, date: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Jam Mulai *</label>
            <select value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
              {timeOptions.map(t => <option key={t} value={t}>{t} WIB</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Jam Selesai *</label>
            <select value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
              {timeOptions.filter(t => t > form.startTime).map(t => <option key={t} value={t}>{t} WIB</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">Ruangan *</label>
          {!rooms ? (
            <p className="text-xs text-gray-400">Memuat ruangan tersedia...</p>
          ) : (
            <div className="space-y-2">
              {/* Always show current room even if not in available list */}
              {booking && !rooms.find((r: any) => String(r.id) === String(booking.meetingRoomId)) && (
                <label className="flex items-center gap-3 p-3 rounded-lg border border-purple-500 bg-purple-50 cursor-pointer">
                  <input type="radio" name="meetingRoomId" value={String(booking.meetingRoomId)}
                    checked={form.meetingRoomId === String(booking.meetingRoomId)}
                    onChange={e => setForm({ ...form, meetingRoomId: e.target.value })}
                    className="accent-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{booking.meetingRoom.name} (sekarang)</p>
                    <p className="text-xs text-gray-500">Kapasitas {booking.meetingRoom.capacity} orang</p>
                  </div>
                </label>
              )}
              {rooms.map((r: any) => (
                <label key={r.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    form.meetingRoomId === String(r.id) ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <input type="radio" name="meetingRoomId" value={String(r.id)}
                    checked={form.meetingRoomId === String(r.id)}
                    onChange={e => setForm({ ...form, meetingRoomId: e.target.value })}
                    className="accent-purple-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{r.name}</p>
                    <p className="text-xs text-gray-500">Kapasitas {r.capacity} orang</p>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Link href={`/meeting-bookings/${id}`}
            className="flex-1 text-center border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Batal
          </Link>
          <button onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !form.title || !form.meetingRoomId || !form.date || durationMin <= 0}
            className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-60">
            {saveMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </div>
    </div>
  );
}
