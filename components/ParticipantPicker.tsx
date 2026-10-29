"use client";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

export interface DirectoryUser {
  id: number;
  name: string;
  email: string;
  division?: { name: string } | null;
}

interface Props {
  selected: number[];
  onChange: (ids: number[]) => void;
}

export default function ParticipantPicker({ selected, onChange }: Props) {
  const [query, setQuery] = useState("");

  const { data: users, isLoading, isError } = useQuery<DirectoryUser[]>({
    queryKey: ["users-directory"],
    queryFn: async () => {
      const res = await fetch("/api/users/directory");
      if (!res.ok) throw new Error("Gagal memuat daftar user");
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    const list = users ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

  function toggle(id: number) {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);
  }

  const selectedUsers = (users ?? []).filter(u => selected.includes(u.id));

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-600">
          Peserta <span className="text-gray-400">(opsional)</span>
        </label>
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])}
            className="text-xs text-purple-600 hover:underline">Kosongkan</button>
        )}
      </div>

      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedUsers.map(u => (
            <span key={u.id}
              className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
              {u.name}
              <button type="button" onClick={() => toggle(u.id)}
                className="text-purple-400 hover:text-purple-700" aria-label={`Hapus ${u.name}`}>✕</button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text" value={query} onChange={e => setQuery(e.target.value)}
        placeholder="Cari nama atau email..."
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-2"
      />

      <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-50">
        {isLoading ? (
          <p className="text-xs text-gray-400 px-3 py-3">Memuat daftar user...</p>
        ) : isError ? (
          <p className="text-xs text-red-500 px-3 py-3">Gagal memuat daftar user</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-gray-400 px-3 py-3">Tidak ada user cocok</p>
        ) : (
          filtered.map(u => (
            <label key={u.id}
              className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
              <input type="checkbox" checked={selected.includes(u.id)}
                onChange={() => toggle(u.id)} className="accent-purple-600" />
              <div className="min-w-0">
                <p className="text-sm text-gray-800 truncate">{u.name}</p>
                <p className="text-xs text-gray-400 truncate">
                  {u.email}{u.division?.name ? ` · ${u.division.name}` : ""}
                </p>
              </div>
            </label>
          ))
        )}
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Notifikasi dikirim ke pemesan dan peserta yang dipilih (via aplikasi Notiv).
      </p>
    </div>
  );
}
