"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import BookingCalendar from "@/components/BookingCalendar";
import { todayWIB } from "@/lib/wib";

function NewBookingForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState({
    title: "",
    description: "",
    carId: "",
    date: "",
    startTime: "",
    endTime: "",
  });
  const [error, setError] = useState("");
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

  const { data: cars } = useQuery({
    queryKey: ["cars", form.date, form.startTime, form.endTime],
    enabled: !!form.date && !!form.startTime && !!form.endTime && durationMin > 0,
    queryFn: async () => {
      const params = new URLSearchParams({
        date:      form.date,
        startTime: form.startTime,
        endTime:   form.endTime,
      });
      const res = await fetch(`/api/cars?${params}`);
      return res.json();
    },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.carId || !form.date || !form.startTime || !form.endTime) {
      setError("Lengkapi semua field yang wajib diisi");
      return;
    }
    if (durationMin <= 0) {
      setError("Jam selesai harus lebih dari jam mulai");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title:       form.title,
        description: form.description,
        carId:       form.carId,
        date:        form.date,
        startSlot:   form.startTime,
        endSlot:     form.endTime,
        durationMin,
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Gagal membuat booking");
    } else {
      router.push(`/bookings/${data.id}`);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
      {/* LEFT — Calendar mini */}
      <BookingCalendar
        selectedDate={form.date}
        onSelectDate={date => setForm(f => ({ ...f, date, carId: "" }))}
      />

      {/* RIGHT — Form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keperluan <span className="text-red-500">*</span>
            </label>
            <input
              type="text" maxLength={100} value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="cth. Kunjungan klien ke kantor pusat"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
            <textarea maxLength={500} value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Detail perjalanan (opsional)" rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal <span className="text-red-500">*</span>
            </label>
            <input
              type="date" value={form.date}
              min={todayWIB()}
              onChange={e => setForm({ ...form, date: e.target.value, carId: "" })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Start & End time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jam Mulai <span className="text-gray-400 text-xs">(WIB)</span> <span className="text-red-500">*</span>
              </label>
              <input
                type="time" value={form.startTime}
                onChange={e => setForm({ ...form, startTime: e.target.value, carId: "" })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jam Selesai <span className="text-gray-400 text-xs">(WIB)</span> <span className="text-red-500">*</span>
              </label>
              <input
                type="time" value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value, carId: "" })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Duration info */}
          {form.startTime && form.endTime && durationMin > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm flex flex-wrap items-center gap-x-4 gap-y-1">
              <div><span className="text-gray-500">Mulai:</span> <span className="font-semibold">{form.startTime} WIB</span></div>
              <div><span className="text-gray-500">Selesai:</span> <span className="font-semibold">{form.endTime} WIB</span></div>
              <div><span className="text-gray-500">Durasi:</span> <span className="font-semibold">
                {durationMin >= 60
                  ? `${Math.floor(durationMin/60)} jam${durationMin%60>0 ? ` ${durationMin%60} mnt` : ""}`
                  : `${durationMin} menit`}
              </span></div>
            </div>
          )}
          {form.startTime && form.endTime && durationMin <= 0 && (
            <p className="text-xs text-red-500">Jam selesai harus lebih dari jam mulai</p>
          )}

          {/* Car selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kendaraan <span className="text-red-500">*</span>
            </label>
            {!form.date || !form.startTime || !form.endTime ? (
              <p className="text-xs text-gray-400 italic">Isi tanggal, jam mulai, dan jam selesai terlebih dahulu</p>
            ) : durationMin <= 0 ? (
              <p className="text-xs text-gray-400 italic">Perbaiki jam terlebih dahulu</p>
            ) : !cars ? (
              <p className="text-xs text-gray-400">Memuat kendaraan...</p>
            ) : cars.length === 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
                Tidak ada kendaraan tersedia untuk waktu ini
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {cars.map((car: any) => (
                  <label key={car.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                      form.carId === String(car.id) ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}
                  >
                    <input type="radio" name="car" value={car.id}
                      checked={form.carId === String(car.id)}
                      onChange={() => setForm({ ...form, carId: String(car.id) })}
                      className="accent-blue-600"
                    />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{car.name}</p>
                      <p className="text-xs text-gray-500">{car.plate} · {car.type} · {car.capacity} kursi</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Tersedia</span>
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
            <button type="submit"
              disabled={loading || !form.title || !form.carId || !form.date || !form.startTime || !form.endTime || durationMin <= 0}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
              {loading ? "Memproses..." : "Konfirmasi Booking"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NewBookingPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Booking Kendaraan</h1>
        <p className="text-gray-500 text-sm mt-1">Pilih tanggal dan waktu yang tersedia</p>
      </div>
      <Suspense fallback={<div className="py-10 text-center text-gray-400">Memuat...</div>}>
        <NewBookingForm />
      </Suspense>
    </div>
  );
}
