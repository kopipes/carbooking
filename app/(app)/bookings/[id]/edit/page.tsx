"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { todayWIB, fmtWIB } from "@/lib/wib";
import Link from "next/link";

export default function EditBookingPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const router = useRouter();
  const qc = useQueryClient();

  const [form, setForm] = useState({
    title: "", description: "", carId: "",
    date: "", startTime: "", endTime: "",
  });
  const [error, setError] = useState("");

  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: async () => {
      const res = await fetch(`/api/bookings/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  // Pre-fill form from booking
  useEffect(() => {
    if (!booking) return;
    // Convert UTC times to WIB HH:MM
    const toWIBTime = (utc: string) => {
      const d = new Date(new Date(utc).getTime() + 7 * 3600000);
      return `${String(d.getUTCHours()).padStart(2,"0")}:${String(d.getUTCMinutes()).padStart(2,"0")}`;
    };
    const toWIBDate = (utc: string) => {
      const d = new Date(new Date(utc).getTime() + 7 * 3600000);
      return d.toISOString().split("T")[0];
    };
    setForm({
      title:       booking.title,
      description: booking.description ?? "",
      carId:       String(booking.carId),
      date:        toWIBDate(booking.startTime),
      startTime:   toWIBTime(booking.startTime),
      endTime:     toWIBTime(booking.endTime),
    });
  }, [booking]);

  const durationMin = form.startTime && form.endTime
    ? (() => {
        const [sh, sm] = form.startTime.split(":").map(Number);
        const [eh, em] = form.endTime.split(":").map(Number);
        return (eh * 60 + em) - (sh * 60 + sm);
      })()
    : 0;

  const { data: cars } = useQuery({
    queryKey: ["cars", form.date, form.startTime, form.endTime, id],
    enabled: !!form.date && !!form.startTime && !!form.endTime && durationMin > 0,
    queryFn: async () => {
      const params = new URLSearchParams({
        date: form.date, startTime: form.startTime, endTime: form.endTime,
      });
      const res = await fetch(`/api/cars?${params}`);
      return res.json();
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title, description: form.description,
          carId: form.carId, date: form.date,
          startSlot: form.startTime, endSlot: form.endTime, durationMin,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal menyimpan");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["booking", id] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
      router.push(`/bookings/${id}`);
    },
    onError: (e: any) => setError(e.message),
  });

  const role   = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  if (isLoading) return <div className="py-16 text-center text-gray-400">Memuat...</div>;
  if (!booking)  return <div className="py-16 text-center text-gray-400">Booking tidak ditemukan</div>;

  const canEdit = role === "ADMIN" || String(booking.userId) === String(userId);
  if (!canEdit) return (
    <div className="py-16 text-center text-gray-400">
      Anda tidak memiliki akses untuk mengedit booking ini
    </div>
  );

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href={`/bookings/${id}`} className="text-gray-400 hover:text-gray-600 text-sm">← Kembali</Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <h1 className="text-xl font-bold text-gray-800 mb-5">Edit Booking</h1>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keperluan <span className="text-red-500">*</span>
            </label>
            <input type="text" maxLength={100} value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
            <textarea maxLength={500} value={form.description} rows={2}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tanggal <span className="text-red-500">*</span>
            </label>
            <input type="date" value={form.date} min={todayWIB()}
              onChange={e => setForm({ ...form, date: e.target.value, carId: "" })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jam Mulai (WIB)</label>
              <input type="time" value={form.startTime}
                onChange={e => setForm({ ...form, startTime: e.target.value, carId: "" })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jam Selesai (WIB)</label>
              <input type="time" value={form.endTime}
                onChange={e => setForm({ ...form, endTime: e.target.value, carId: "" })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {form.startTime && form.endTime && durationMin > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5 text-sm flex items-center gap-4">
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

          {/* Car */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kendaraan</label>
            {!cars ? (
              <p className="text-xs text-gray-400">Memuat kendaraan...</p>
            ) : (
              <div className="space-y-2">
                {/* Always show current car even if not in available list */}
                {[...( cars ?? [])].map((car: any) => (
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
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Tersedia</span>
                  </label>
                ))}
                {cars.length === 0 && (
                  <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                    Tidak ada kendaraan tersedia untuk waktu ini
                  </p>
                )}
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <Link href={`/bookings/${id}`}
              className="flex-1 text-center border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
              Batal
            </Link>
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !form.title || !form.carId || !form.date || durationMin <= 0}
              className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {saveMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
