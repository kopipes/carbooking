import { prisma } from "@/lib/prisma";
import type { NotificationSummary } from "@/lib/notiv";

export interface NotificationLogContext {
  type: "booking" | "meeting" | "password_reset";
  action: "created" | "updated" | "cancelled" | "requested";
  bookingId: number | null;
  notification: NotificationSummary | null;
}

/**
 * Persist one row per recipient so admins can see which notifications were
 * delivered and which failed (typically because the recipient has no active,
 * verified account connected to the Notiv integration).
 *
 * Logging must never break the booking flow, so failures are swallowed.
 */
export async function recordNotificationResults(context: NotificationLogContext): Promise<void> {
  const results = context.notification?.results ?? [];
  if (results.length === 0) return;

  try {
    await prisma.notificationLog.createMany({
      data: results.map(r => ({
        type: context.type,
        action: context.action,
        bookingId: context.bookingId,
        recipientEmail: r.email,
        status: r.ok ? "sent" : "failed",
        error: r.ok ? null : r.error ?? "Unknown error",
      })),
    });
  } catch (err) {
    console.error("Failed to record notification log:", err);
  }
}
