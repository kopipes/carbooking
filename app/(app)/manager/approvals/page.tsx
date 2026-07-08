"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

function statusColor(s: string) {
  const map: Record<string, string> = {
    APPROVED: "bg-green-100 text-green-700",
    PENDING: "bg-yellow-100 text-yellow-700",
    REJECTED: "bg-red-100 text-red-700",
  };
  return map[s] ?? "bg-gray-100 text-gray-600";
}

function fmt(d: string) {
  return new Date(d).toLocaleString("id-ID", {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export default function ApprovalsPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["approvals"],
    queryFn: async () => {
      const res = await fetch("/api/bookings?status=PENDING&limit=50&page=1");
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await fetch(`/api/bookings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approvals"] });
      qc.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">Pending Approvals</h1>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">Loading...</div>
        ) : data?.bookings?.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <p className="text-lg font-medium">All clear!</p>
            <p className="text-sm mt-1">No pending bookings to review</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {data?.bookings?.map((b: any) => (
              <div key={b.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800">{b.title}</p>
                  {b.description && <p className="text-xs text-gray-500 mt-0.5">{b.description}</p>}
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-500">
                    <span>{b.user.name}</span>
                    <span>&middot;</span>
                    <span>{b.car.name} ({b.car.plate})</span>
                    <span>&middot;</span>
                    <span>{fmt(b.startTime)} &rarr; {fmt(b.endTime)}</span>
                    <span>&middot;</span>
                    <span>{b.durationMin} min</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => mutation.mutate({ id: b.id, status: "APPROVED" })}
                    disabled={mutation.isPending}
                    className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-60"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => mutation.mutate({ id: b.id, status: "REJECTED" })}
                    disabled={mutation.isPending}
                    className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
