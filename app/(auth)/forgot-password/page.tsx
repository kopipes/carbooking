"use client";
import { useState, Suspense } from "react";
import Link from "next/link";

function ForgotPasswordForm() {
  const [email, setEmail]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Terjadi kesalahan, coba lagi");
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-semibold text-gray-800">Email terkirim</h3>
        <p className="text-sm text-gray-500">
          Kalau email <strong>{email}</strong> terdaftar, kamu akan menerima link reset password.
          Cek inbox (dan folder spam) kamu.
        </p>
        <p className="text-xs text-gray-400">Link berlaku selama 1 jam.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email" value={email} required
          onChange={e => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-60 text-sm">
        {loading ? "Mengirim..." : "Kirim Link Reset"}
      </button>
      <div className="text-center">
        <Link href="/login" className="text-sm text-gray-500 hover:text-blue-600 transition-colors">
          ← Kembali ke login
        </Link>
      </div>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">Booking</h1>
          <p className="text-gray-500 mt-1 text-sm">Reset password kamu</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Lupa Password?</h2>
          <p className="text-sm text-gray-500 mb-6">Masukkan email kamu dan kami akan kirimkan link reset password.</p>
          <Suspense fallback={<div className="text-sm text-gray-400">Loading...</div>}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
