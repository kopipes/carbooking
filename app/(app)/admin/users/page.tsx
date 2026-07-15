"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

type User = {
  id: number; name: string; email: string; role: string;
  phone?: string; active: boolean;
  division: { name: string; code: string };
};

const ROLES = ["USER", "MANAGER", "ADMIN"];

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const blank = { name: "", email: "", password: "", role: "USER", phone: "", divisionId: "" };
  const [form, setForm]     = useState(blank);
  const [editId, setEditId] = useState<number | null>(null);
  const [error, setError]   = useState("");
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["users-admin"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  });

  // Client-side search filter
  const filteredUsers = (users ?? []).filter(u => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.division?.name.toLowerCase().includes(q) ||
      u.division?.code.toLowerCase().includes(q) ||
      (u.phone ?? "").toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    );
  });

  const { data: divisions } = useQuery<{ id: number; name: string; code: string }[]>({
    queryKey: ["divisions"],
    queryFn: () => fetch("/api/divisions").then((r) => r.json()),
  });

  const save = useMutation({
    mutationFn: async () => {
      const url = editId ? `/api/users/${editId}` : "/api/users";
      const method = editId ? "PATCH" : "POST";
      const payload: any = { ...form };
      if (editId && !payload.password) delete payload.password;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users-admin"] });
      setForm(blank); setEditId(null); setError(""); setShowForm(false);
    },
    onError: (e: any) => setError(e.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Gagal menghapus user");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users-admin"] }),
    onError: (e: any) => alert(e.message),
  });

  function startEdit(u: User) {
    setEditId(u.id);
    setForm({ name: u.name, email: u.email, password: "", role: u.role, phone: u.phone ?? "", divisionId: String((u as any).divisionId ?? "") });
    setShowForm(true);
  }

  const roleColor: Record<string, string> = {
    ADMIN: "bg-red-100 text-red-700",
    MANAGER: "bg-blue-100 text-blue-700",
    USER: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Users</h1>
        <button
          onClick={() => { setShowForm(!showForm); setEditId(null); setForm(blank); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          {showForm ? "Cancel" : "+ Add User"}
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Cari nama, email, divisi, role..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            ✕
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-semibold text-gray-700 mb-4">{editId ? "Edit User" : "New User"}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              placeholder="Full Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              placeholder="Email *"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="password"
              placeholder={editId ? "New password (leave blank to keep)" : "Password *"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLES.map((r) => <option key={r}>{r}</option>)}
            </select>
            <select
              value={form.divisionId}
              onChange={(e) => setForm({ ...form, divisionId: e.target.value })}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Division *</option>
              {divisions?.map((d) => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => save.mutate()}
              disabled={!form.name || !form.email || (!editId && !form.password) || !form.divisionId || save.isPending}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {save.isPending ? "Saving..." : editId ? "Update" : "Create User"}
            </button>
            <button
              onClick={() => { setShowForm(false); setEditId(null); setForm(blank); }}
              className="border border-gray-300 px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-gray-400">Loading...</div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-10 text-center text-gray-400">
            {search ? `Tidak ada hasil untuk "${search}"` : "Belum ada user"}
          </div>
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredUsers.map(u => (
                <div key={u.id} className={`px-4 py-4 ${!u.active ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                        {u.role}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {u.active ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5 mb-3">
                    <p>{u.division?.name} <span className="text-gray-400">({u.division?.code})</span></p>
                    {u.phone && <p>{u.phone}</p>}
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { startEdit(u); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="text-sm text-blue-600 font-medium hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Hapus permanen ${u.name}? Semua booking miliknya juga akan dihapus. Tindakan ini tidak bisa dibatalkan.`))
                          deleteUser.mutate(u.id);
                      }}
                      className="text-sm text-red-600 font-medium hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Name</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Email</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Division</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Role</th>
                    <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={`hover:bg-gray-50 ${!u.active ? "opacity-50" : ""}`}>
                      <td className="px-4 py-3 font-medium text-gray-800">{u.name}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3 text-gray-600">{u.division?.name}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColor[u.role] ?? "bg-gray-100 text-gray-600"}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                          {u.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => startEdit(u)} className="text-blue-600 hover:underline text-xs mr-3">Edit</button>
                        <button
                          onClick={() => {
                            if (confirm(`Hapus permanen ${u.name}? Semua booking miliknya juga akan dihapus. Tindakan ini tidak bisa dibatalkan.`))
                              deleteUser.mutate(u.id);
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
