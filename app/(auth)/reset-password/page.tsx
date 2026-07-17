"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams          = useSearchParams();
  const router                = useRouter();
  const [token, setToken]     = useState("");
  const [password, setPassword]   = useState("");
  const [confirm, setConfirm]     = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState(false);

  useEffect(() => {
    const t = searchParams.get("token") ?? "";
    if (!t) setError("Link reset tidak valid. Minta ulang reset password.");
    setToken(t);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Password tidak cocok"); return;
    }
    if (password.length < 8) {
      setError("Password minimal 8 karakter"); return;
    }
    setLoading(true); setError("");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Terjadi kesalahan, coba lagi");
      return;
    }
    setSuccess(true);
    setTimeout(() => router.push("/login"), 3000);
  }

  if (success) {
    return (
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-800">Password berhasil diubah</h3>
        <p className="text-sm text-gray-500">Kamu akan diarahkan ke halaman login dalam 3 detik...</p>
        <Link href="/login" className="text-sm text-blue-600 hover:underline">Login sekarang</Link>
      </div>
    );
  }

  if (!token && error) {
    return (
      <div className="text-center space-y-3">
        <p className="text-sm text-red-500">{error}</p>
        <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
          Minta link reset baru
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password Baru</label>
        <input
          type="password" value={password} required minLength={8}
          onChange={e => setPassword(e.target.value)}
          placeholder="Minimal 8 karakter"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Konfirmasi Password</label>
        <input
          type="password" value={confirm} required minLength={8}
          onChange={e => setConfirm(e.target.value)}
          placeholder="Ulangi password baru"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" disabled={loading || !token}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 text-sm">
        {loading ? "Menyimpan..." : "Simpan Password Baru"}
      </button>
      <div className="text-center">
        <Link href="/login" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
          ← Kembali ke login
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">Booking</h1>
          <p className="text-gray-500 mt-1 text-sm">Buat password baru</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Reset Password</h2>
          <p className="text-sm text-gray-500 mb-6">Masukkan password baru untuk akun kamu.</p>
          <Suspense fallback={<div className="text-sm text-gray-400">Loading...</div>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
