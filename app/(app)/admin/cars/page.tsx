"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type Car = { id: number; name: string; plate: string; type: string; capacity: number; status: string };
const STATUSES = ["AVAILABLE", "MAINTENANCE"];

export default function AdminCarsPage() {
  const qc = useQueryClient();
  const blank = { name: "", plate: "", type: "MPV", capacity: "7", status: "AVAILABLE" };
  const [form, setForm] = useState(blank);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const { data: cars, isLoading } = useQuery<Car[]>({
    queryKey: ["cars-admin"],
    queryFn: () => fetch("/api/cars").then((r) => r.json()),
  });

  const save = useMutation({
    mutationFn: async () => {
      const url = editId ? `/api/cars/${editId}` : "/api/cars";
      const method = editId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, capacity: parseInt(form.capacity) }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      return res.json();
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["cars-admin"] }); setForm(blank); setEditId(null); setError(""); },
    onError: (e: any) => setError(e.message),
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/cars/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cars-admin"] }),
  });

  function startEdit(c: Car) {
    setEditId(c.id);
    setForm({ name: c.name, plate: c.plate, type: c.type, capacity: String(c.capacity), status: c.status });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-800">Cars</h1>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-4">{editId ? "Edit Car" : "Add Car"}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <input placeholder="Car Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input placeholder="License Plate *" value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {["MPV", "SUV", "Sedan", "Pickup"].map((t) => <option key={t}>{t}</option>)}
          </select>
          <input type="number" placeholder="Capacity" min="1" max="20" value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <div className="flex gap-2 mt-3">
          <button onClick={() => save.mutate()} disabled={!form.name || !form.plate || save.isPending}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
            {save.isPending ? "Saving..." : editId ? "Update" : "Add Car"}
          </button>
          {editId && (
            <button onClick={() => { setEditId(null); setForm(blank); }}
              className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? <div className="py-12 text-center text-gray-400">Loading...</div> : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Plate</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Type</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Capacity</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {cars?.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-600 text-xs">{c.plate}</td>
                  <td className="px-4 py-3 text-gray-600">{c.type}</td>
                  <td className="px-4 py-3 text-gray-600">{c.capacity} seats</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === "AVAILABLE" ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(c)} className="text-blue-600 hover:underline text-xs mr-3">Edit</button>
                    <button onClick={() => { if (confirm(`Delete ${c.name}?`)) del.mutate(c.id); }} className="text-red-500 hover:underline text-xs">Delete</button>
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
