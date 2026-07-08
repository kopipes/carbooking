"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type Driver = { id: number; name: string; phone?: string; license?: string; active: boolean };

export default function AdminDriversPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", phone: "", license: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const { data: drivers, isLoading } = useQuery<Driver[]>({
    queryKey: ["drivers"],
    queryFn: () => fetch("/api/drivers").then(r => r.json()),
  });

  const save = useMutation({
    mutationFn: async () => {
      const url    = editId ? `/api/drivers/${editId}` : "/api/drivers";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["drivers"] });
      setForm({ name: "", phone: "", license: "" });
      setEditId(null);
      setError("");
    },
    onError: (e: any) => setError(e.message),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) => fetch(`/api/drivers/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["drivers"] }),
  });

  function startEdit(d: Driver) {
    setEditId(d.id);
    setForm({ name: d.name, phone: d.phone ?? "", license: d.license ?? "" });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800">Driver</h1>

      {/* Form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-4">{editId ? "Edit Driver" : "Tambah Driver"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input placeholder="Nama Lengkap *" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input placeholder="No. Telepon" value={form.phone}
            onChange={e => setForm({ ...form, phone: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input placeholder="No. SIM" value={form.license}
            onChange={e => setForm({ ...form, license: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => save.mutate()}
            disabled={!form.name || save.isPending}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {save.isPending ? "Menyimpan..." : editId ? "Update" : "Tambah"}
          </button>
          {editId && (
            <button
              onClick={() => { setEditId(null); setForm({ name: "", phone: "", license: "" }); }}
              className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Batal
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Memuat...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Nama</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Telepon</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">No. SIM</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {drivers?.map(d => (
                <tr key={d.id} className={`hover:bg-gray-50 ${!d.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                  <td className="px-4 py-3 text-gray-600">{d.phone ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{d.license ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {d.active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(d)} className="text-blue-600 hover:underline text-xs mr-3">Edit</button>
                    {d.active && (
                      <button
                        onClick={() => { if (confirm(`Nonaktifkan ${d.name}?`)) deactivate.mutate(d.id); }}
                        className="text-red-500 hover:underline text-xs"
                      >
                        Nonaktifkan
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {drivers?.length === 0 && (
                <tr><td colSpan={5} className="py-10 text-center text-gray-400">Belum ada driver</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
