"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type MeetingRoom = { id: number; name: string; capacity: number; active: boolean };

export default function AdminMeetingRoomsPage() {
  const qc = useQueryClient();
  const blank = { name: "", capacity: "10" };
  const [form, setForm]     = useState(blank);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError]   = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: rooms, isLoading } = useQuery<MeetingRoom[]>({
    queryKey: ["meeting-rooms-admin"],
    queryFn: () => fetch("/api/meeting-rooms?all=1").then(r => r.json()),
  });

  const save = useMutation({
    mutationFn: async () => {
      const url    = editId ? `/api/meeting-rooms/${editId}` : "/api/meeting-rooms";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, capacity: parseInt(form.capacity) || 10 }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal menyimpan");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting-rooms-admin"] });
      qc.invalidateQueries({ queryKey: ["meeting-rooms"] });
      setForm(blank); setEditId(null); setError(""); setShowForm(false);
    },
    onError: (e: any) => setError(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/meeting-rooms/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal menghapus");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meeting-rooms-admin"] });
      qc.invalidateQueries({ queryKey: ["meeting-rooms"] });
    },
    onError: (e: any) => setError(e.message),
  });

  function startEdit(r: MeetingRoom) {
    setEditId(r.id);
    setForm({ name: r.name, capacity: String(r.capacity) });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Meeting Rooms</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm(blank); setError(""); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? "Batal" : "+ Tambah Ruangan"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-4">{editId ? "Edit Ruangan" : "Tambah Ruangan"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nama Ruangan *</label>
              <input
                placeholder="cth. Ruang Rapat A"
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kapasitas</label>
              <input
                type="number" min="1"
                placeholder="10"
                value={form.capacity}
                onChange={e => setForm({ ...form, capacity: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => save.mutate()}
              disabled={!form.name || save.isPending}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {save.isPending ? "Menyimpan..." : editId ? "Update" : "Simpan"}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditId(null); setForm(blank); setError(""); }}
              className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Memuat...</div>
        ) : !rooms?.length ? (
          <div className="py-10 text-center text-gray-400">Belum ada ruangan meeting</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Nama Ruangan</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Kapasitas</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rooms.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50 ${!r.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{r.name}</td>
                  <td className="px-4 py-3 text-gray-600">{r.capacity} orang</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {r.active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(r)} className="text-blue-600 hover:underline text-xs mr-3">Edit</button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus ruangan ${r.name}? Tidak bisa dibatalkan.`)) del.mutate(r.id);
                      }}
                      className="text-red-600 hover:underline text-xs"
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
