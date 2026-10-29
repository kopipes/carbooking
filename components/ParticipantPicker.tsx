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
  externalEmails: string[];
  onExternalEmailsChange: (emails: string[]) => void;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ParticipantPicker({
  selected,
  onChange,
  externalEmails,
  onExternalEmailsChange,
}: Props) {
  const [query, setQuery] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [emailError, setEmailError] = useState("");

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

  function addExternalEmail() {
    const email = emailInput.trim().toLowerCase();
    if (!email) return;

    if (email.length > 254 || !EMAIL_RE.test(email)) {
      setEmailError("Format email tidak valid");
      return;
    }

    const isAppUser = (users ?? []).some(u => u.email.toLowerCase() === email);
    if (isAppUser) {
      setEmailError("Email ini sudah ada di daftar user — centang namanya di atas");
      return;
    }
    if (externalEmails.some(e => e.toLowerCase() === email)) {
      setEmailError("Email sudah ditambahkan");
      return;
    }

    onExternalEmailsChange([...externalEmails, email]);
    setEmailInput("");
    setEmailError("");
  }

  function removeExternalEmail(email: string) {
    onExternalEmailsChange(externalEmails.filter(e => e !== email));
  }

  const selectedUsers = (users ?? []).filter(u => selected.includes(u.id));
  const totalSelected = selectedUsers.length + externalEmails.length;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-medium text-gray-600">
          Peserta <span className="text-gray-400">(opsional)</span>
        </label>
        {totalSelected > 0 && (
          <button type="button" onClick={() => { onChange([]); onExternalEmailsChange([]); }}
            className="text-xs text-purple-600 hover:underline">Kosongkan</button>
        )}
      </div>

      {totalSelected > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedUsers.map(u => (
            <span key={`u-${u.id}`}
              className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
              {u.name}
              <button type="button" onClick={() => toggle(u.id)}
                className="text-purple-400 hover:text-purple-700" aria-label={`Hapus ${u.name}`}>✕</button>
            </span>
          ))}
          {externalEmails.map(email => (
            <span key={`e-${email}`}
              className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-700 border border-dashed border-gray-300 px-2 py-0.5 rounded-full">
              {email}
              <span className="text-[10px] text-gray-400">eksternal</span>
              <button type="button" onClick={() => removeExternalEmail(email)}
                className="text-gray-400 hover:text-gray-700" aria-label={`Hapus ${email}`}>✕</button>
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

      {/* External email */}
      <div className="mt-3">
        <label className="block text-xs font-medium text-gray-600 mb-1">
          Email lain <span className="text-gray-400">(di luar daftar user)</span>
        </label>
        <div className="flex gap-2">
          <input
            type="email" value={emailInput}
            onChange={e => { setEmailInput(e.target.value); setEmailError(""); }}
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addExternalEmail(); } }}
            placeholder="nama@perusahaan.com"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button type="button" onClick={addExternalEmail}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
            Tambah
          </button>
        </div>
        {emailError && <p className="text-xs text-red-500 mt-1">{emailError}</p>}
      </div>

      <p className="text-xs text-gray-400 mt-1">
        Notifikasi dikirim ke pemesan dan peserta yang dipilih (via aplikasi Notiv).
        Email eksternal hanya menerima notifikasi jika akun Notiv-nya aktif dan terhubung.
      </p>
    </div>
  );
}
