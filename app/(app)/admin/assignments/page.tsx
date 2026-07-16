"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { todayWIB, fmtDateWIB } from "@/lib/wib";

type Driver = { id: number; name: string; phone?: string; active: boolean };
type Car    = {
  id: number; name: string; plate: string; status: string;
  defaultDriverId: number | null;
  defaultDriver: { id: number; name: string; phone: string | null } | null;
};

type Assignment = {
  id: number;
  date: string;
  note?: string;
  car: { id: number; name: string; plate: string };
  driver: { id: number; name: string; phone?: string };
};

export default function AdminAssignmentsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ carId: "", driverId: "", date: todayWIB(), note: "" });
  const [filterDate, setFilterDate] = useState(todayWIB());
  const [error, setError] = useState("");
  const [defaultError, setDefaultError] = useState("");

  const { data: cars }    = useQuery<Car[]>({    queryKey: ["cars-admin"], queryFn: () => fetch("/api/cars?all=1").then(r => r.json()) });
  const { data: drivers } = useQuery<Driver[]>({ queryKey: ["drivers"],    queryFn: () => fetch("/api/drivers").then(r => r.json()) });

  const { data: assignments, isLoading } = useQuery<Assignment[]>({
    queryKey: ["assignments", filterDate],
    queryFn: () => fetch(`/api/assignments?date=${filterDate}`).then(r => r.json()),
  });

  const save = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      setForm(f => ({ ...f, carId: "", driverId: "", note: "" }));
      setError("");
    },
    onError: (e: any) => setError(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal menghapus");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assignments"] }),
    onError: (e: any) => alert(e.message),
  });

  const setDefaultDriver = useMutation({
    mutationFn: async ({ carId, driverId }: { carId: number; driverId: string }) => {
      const res = await fetch(`/api/cars/${carId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultDriverId: driverId === "" ? null : parseInt(driverId) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal mengubah default driver");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cars-admin"] });
      setDefaultError("");
    },
    onError: (e: any) => setDefaultError(e.message),
  });

  const activeDrivers = (drivers ?? []).filter(d => d.active);

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800">Penugasan Driver</h1>
      <p className="text-sm text-gray-500 -mt-4">
        Setiap kendaraan punya <strong>default driver</strong>. Penugasan per-tanggal akan menggantikan default driver untuk hari itu saja.
      </p>

      {/* Default drivers per car */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-1">Default Driver per Kendaraan</h2>
        <p className="text-xs text-gray-500 mb-4">Driver yang otomatis dipakai untuk setiap booking, kecuali ada penugasan khusus di tanggal tertentu.</p>
        {defaultError && <p className="text-red-500 text-sm mb-2">{defaultError}</p>}
        <div className="divide-y divide-gray-100">
          {(cars ?? []).map(c => (
            <div key={c.id} className="flex items-center gap-3 py-2.5">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                <p className="text-xs text-gray-400 font-mono">{c.plate}</p>
              </div>
              <select
                value={c.defaultDriverId ?? ""}
                onChange={e => setDefaultDriver.mutate({ carId: c.id, driverId: e.target.value })}
                disabled={setDefaultDriver.isPending}
                className="w-56 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
              >
                <option value="">— Belum ada default —</option>
                {activeDrivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}{d.phone ? ` — ${d.phone}` : ""}</option>
                ))}
              </select>
            </div>
          ))}
          {(cars ?? []).length === 0 && (
            <p className="text-sm text-gray-400 py-3">Belum ada kendaraan</p>
          )}
        </div>
      </div>

      {/* Form: per-date override */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-1">Ganti Driver untuk Tanggal Tertentu</h2>
        <p className="text-xs text-gray-500 mb-4">Override default driver hanya untuk hari yang dipilih.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tanggal</label>
            <input type="date" value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Kendaraan</label>
            <select value={form.carId} onChange={e => setForm({ ...form, carId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Pilih kendaraan</option>
              {(cars ?? []).filter(c => c.status === "AVAILABLE").map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.plate})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Driver Pengganti</label>
            <select value={form.driverId} onChange={e => setForm({ ...form, driverId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Pilih driver</option>
              {activeDrivers.map(d => (
                <option key={d.id} value={d.id}>{d.name}{d.phone ? ` — ${d.phone}` : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Catatan</label>
            <input placeholder="Opsional" value={form.note}
              onChange={e => setForm({ ...form, note: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <button
          onClick={() => save.mutate()}
          disabled={!form.carId || !form.driverId || !form.date || save.isPending}
          className="mt-3 bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {save.isPending ? "Menyimpan..." : "Simpan Penugasan Tanggal"}
        </button>
        <p className="text-xs text-gray-400 mt-1.5">Jika kendaraan sudah ditugaskan di tanggal ini, akan otomatis diganti.</p>
      </div>

      {/* Filter + list */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <h2 className="font-semibold text-gray-700 flex-1">Penugasan Tanggal Khusus</h2>
          <label className="text-sm text-gray-500">Tanggal:</label>
          <input type="date" value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Memuat...</div>
        ) : !assignments?.length ? (
          <div className="py-12 text-center text-gray-400">Tidak ada penugasan khusus untuk tanggal ini. Semua booking pakai default driver.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Tanggal</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Kendaraan</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Driver</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Telepon</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Catatan</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {assignments.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                    {fmtDateWIB(a.date + "T12:00:00Z", { weekday:"short", day:"numeric", month:"short", year:"numeric" })}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {a.car.name}<br/>
                    <span className="text-xs text-gray-400 font-mono">{a.car.plate}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-800 font-medium">{a.driver.name}</td>
                  <td className="px-4 py-3 text-gray-600">{a.driver.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{a.note ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => { if (confirm("Hapus penugasan khusus ini? Booking di tanggal ini akan kembali pakai default driver.")) del.mutate(a.id); }}
                      className="text-red-500 hover:underline text-xs"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
