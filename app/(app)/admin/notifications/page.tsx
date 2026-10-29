"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

interface NotificationLog {
  id: number;
  type: string;
  action: string;
  bookingId: number | null;
  recipientEmail: string;
  status: string;
  error: string | null;
  createdAt: string;
}

type Filter = "all" | "failed";

const ACTION_LABEL: Record<string, string> = {
  created: "Dibuat",
  updated: "Diubah",
  cancelled: "Dibatalkan",
  requested: "Diminta",
};

const TYPE_LABEL: Record<string, string> = {
  booking: "Kendaraan",
  meeting: "Meeting Room",
  password_reset: "Reset Password",
};

function fmt(d: string) {
  return new Date(d).toLocaleString("id-ID", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function NotificationLogPage() {
  const [filter, setFilter] = useState<Filter>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["notification-log", filter],
    queryFn: async () => {
      const params = filter === "failed" ? "?status=failed" : "";
      const res = await fetch(`/api/notifications${params}`);
      if (!res.ok) throw new Error("Gagal memuat log notifikasi");
      return res.json();
    },
  });

  const logs: NotificationLog[] = data?.logs ?? [];

  function bookingHref(log: NotificationLog): string | null {
    if (log.bookingId == null) return null;
    return log.type === "meeting"
      ? `/meeting-bookings/${log.bookingId}`
      : `/bookings/${log.bookingId}`;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Log Notifikasi</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Status pengiriman notifikasi ke aplikasi Notiv
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filter === "all" ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            Semua
          </button>
          <button
            onClick={() => setFilter("failed")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              filter === "failed" ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            Gagal
          </button>
        </div>
        {!isLoading && (
          <div className="flex items-center gap-3 text-gray-500">
            <span className="text-green-700">{data?.sentCount ?? 0} terkirim</span>
            <span className="text-red-600">{data?.failedCount ?? 0} gagal</span>
          </div>
        )}
      </div>

      {filter === "failed" && (
        <p className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
          Notifikasi gagal terkirim lewat Notiv maupun email cadangan. Biasanya karena email
          penerima tidak valid, atau pengiriman Notiv gagal (email belum terverifikasi/belum
          di-connect di Integrations &gt; Manage &gt; Connected recipients) dan email cadangan
          ikut gagal.
        </p>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Memuat...</div>
        ) : logs.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            {filter === "failed" ? "Tidak ada notifikasi gagal" : "Belum ada log notifikasi"}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Waktu</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Jenis</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Aksi</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Penerima</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.map(log => {
                  const href = bookingHref(log);
                  const failed = log.status === "failed";
                  return (
                    <tr key={log.id} className={failed ? "bg-red-50/40" : "hover:bg-gray-50"}>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmt(log.createdAt)}</td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {TYPE_LABEL[log.type] ?? log.type}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                        {ACTION_LABEL[log.action] ?? log.action}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">
                        {log.recipientEmail}
                        {href && (
                          <Link href={href} className="ml-2 text-xs text-blue-600 hover:underline">
                            lihat
                          </Link>
                        )}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          failed ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        }`}>
                          {failed ? "Gagal" : "Terkirim"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-xs text-gray-500 max-w-72">
                        {log.error ?? "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
