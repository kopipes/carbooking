"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type Division = { id: number; name: string; code: string; desc?: string };

export default function AdminDivisionsPage() {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: "", code: "", desc: "" });
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError] = useState("");

  const { data: divisions, isLoading } = useQuery<Division[]>({
    queryKey: ["divisions"],
    queryFn: () => fetch("/api/divisions").then((r) => r.json()),
  });

  const save = useMutation({
    mutationFn: async () => {
      const url = editId ? `/api/divisions/${editId}` : "/api/divisions";
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
      qc.invalidateQueries({ queryKey: ["divisions"] });
      setForm({ name: "", code: "", desc: "" });
      setEditId(null);
      setError("");
    },
    onError: (e: any) => setError(e.message),
  });

  const del = useMutation({
    mutationFn: (id: number) => fetch(`/api/divisions/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["divisions"] }),
  });

  function startEdit(d: Division) {
    setEditId(d.id);
    setForm({ name: d.name, code: d.code, desc: d.desc ?? "" });
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-800">Divisions</h1>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold text-gray-700 mb-4">{editId ? "Edit Division" : "Add Division"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            placeholder="Division Name *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            placeholder="Code (e.g. IT) *"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            placeholder="Description"
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => save.mutate()}
            disabled={!form.name || !form.code || save.isPending}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
          >
            {save.isPending ? "Saving..." : editId ? "Update" : "Add"}
          </button>
          {editId && (
            <button
              onClick={() => { setEditId(null); setForm({ name: "", code: "", desc: "" }); }}
              className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Code</th>
                <th className="text-left px-4 py-3 text-gray-600 font-medium">Description</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {divisions?.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{d.name}</td>
                  <td className="px-4 py-3"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-mono">{d.code}</span></td>
                  <td className="px-4 py-3 text-gray-500">{d.desc ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => startEdit(d)} className="text-blue-600 hover:underline text-xs mr-3">Edit</button>
                    <button onClick={() => { if (confirm(`Delete ${d.name}?`)) del.mutate(d.id); }} className="text-red-500 hover:underline text-xs">Delete</button>
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
