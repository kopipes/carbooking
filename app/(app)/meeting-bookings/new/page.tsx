"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import MeetingCalendar from "@/components/MeetingCalendar";
import { todayWIB, wibToUTC } from "@/lib/wib";

function NewMeetingBookingForm() {
  const router = useRouter();
  const qc     = useQueryClient();
  const searchParams = useSearchParams();

  const [form, setForm] = useState({
    title: "", description: "",
    meetingRoomId: "", date: "",
    startTime: "", endTime: "",
  });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const dateParam  = searchParams.get("date")        ?? todayWIB();
    const startParam = searchParams.get("customStart") ?? "";
    const endParam   = searchParams.get("customEnd")   ?? "";
    setForm(f => ({
      ...f,
      date:      dateParam,
      startTime: startParam || f.startTime,
      endTime:   endParam   || f.endTime,
    }));
  }, [searchParams]);

  const durationMin = form.startTime && form.endTime
    ? (() => {
        const [sh, sm] = form.startTime.split(":").map(Number);
        const [eh, em] = form.endTime.split(":").map(Number);
        return (eh * 60 + em) - (sh * 60 + sm);
      })()
    : 0;

  const { data: rooms } = useQuery({
    queryKey: ["meeting-rooms-available", form.date, form.startTime, form.endTime],
    enabled: !!form.date && !!form.startTime && !!form.endTime && durationMin > 0,
    queryFn: async () => {
      const params = new URLSearchParams({
        date: form.date, startTime: form.startTime, endTime: form.endTime,
      });
      const res = await fetch(`/api/meeting-rooms?${params}`);
      return res.json();
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.meetingRoomId || !form.date || !form.startTime || !form.endTime) {
      setError("Lengkapi semua field yang wajib diisi"); return;
    }
    if (durationMin <= 0) { setError("Jam selesai harus lebih dari jam mulai"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/meeting-bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title, description: form.description,
        meetingRoomId: form.meetingRoomId, date: form.date,
        startSlot: form.startTime, endSlot: form.endTime,
        durationMin: String(durationMin),
      }),
    });
    setLoading(false);
    if (!res.ok) { setError((await res.json()).error ?? "Gagal membuat booking"); return; }
    const data = await res.json();
    // Invalidate availability cache so calendar updates immediately
    qc.invalidateQueries({ queryKey: ["meeting-availability"] });
    qc.invalidateQueries({ queryKey: ["calendar-meeting-bookings"] });
    qc.invalidateQueries({ queryKey: ["meeting-rooms-available"] });
    router.push(`/meeting-bookings/${data.id}`);
  }

  const timeOptions: string[] = [];
  for (let h = 7; h <= 22; h++) {
    timeOptions.push(`${String(h).padStart(2,"0")}:00`);
    if (h < 22) timeOptions.push(`${String(h).padStart(2,"0")}:30`);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* LEFT — Calendar */}
      <MeetingCalendar
        selectedDate={form.date}
        onSelectDate={date => setForm(f => ({ ...f, date, meetingRoomId: "" }))}
      />

      {/* RIGHT — Form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Keperluan / Judul *</label>
          <input placeholder="cth. Rapat Bulanan, Interview, dll."
            value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Deskripsi</label>
          <textarea rows={2} placeholder="Opsional"
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
        </div>

        {/* Tanggal terpilih dari kalender */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal *</label>
          <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700">
            {form.date || <span className="text-gray-400">Pilih tanggal di kalender</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Jam Mulai *</label>
            <select value={form.startTime}
              onChange={e => setForm({ ...form, startTime: e.target.value, meetingRoomId: "" })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Pilih jam</option>
              {timeOptions.map(t => <option key={t} value={t}>{t} WIB</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Jam Selesai *</label>
            <select value={form.endTime}
              onChange={e => setForm({ ...form, endTime: e.target.value, meetingRoomId: "" })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Pilih jam</option>
              {timeOptions.filter(t => t > form.startTime).map(t => <option key={t} value={t}>{t} WIB</option>)}
            </select>
          </div>
        </div>

        {durationMin > 0 && (
          <p className="text-xs text-gray-500">Durasi: {durationMin >= 60 ? `${Math.floor(durationMin/60)} jam${durationMin%60 ? ` ${durationMin%60} menit` : ""}` : `${durationMin} menit`}</p>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ruangan *</label>
          {!form.date || !form.startTime || !form.endTime || durationMin <= 0 ? (
            <p className="text-xs text-gray-400 py-2">Pilih tanggal dan waktu untuk melihat ruangan tersedia</p>
          ) : !rooms ? (
            <p className="text-xs text-gray-400 py-2">Memuat ruangan...</p>
          ) : rooms.length === 0 ? (
            <p className="text-xs text-red-500 py-2">Tidak ada ruangan tersedia untuk waktu ini</p>
          ) : (
            <div className="space-y-2">
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
          <button type="button" onClick={() => router.back()}
            className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            Batal
          </button>
          <button type="submit" onClick={handleSubmit}
            disabled={loading || !form.title || !form.meetingRoomId || !form.date || !form.startTime || !form.endTime || durationMin <= 0}
            className="flex-1 bg-purple-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-60">
            {loading ? "Memproses..." : "Konfirmasi Booking"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewMeetingBookingPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Booking Meeting Room</h1>
        <p className="text-gray-500 text-sm mt-1">Pilih tanggal dari kalender dan waktu yang tersedia</p>
      </div>
      <Suspense fallback={<div className="py-10 text-center text-gray-400">Memuat...</div>}>
        <NewMeetingBookingForm />
      </Suspense>
    </div>
  );
}
