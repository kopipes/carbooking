import { Resend } from "resend";
import {
  notifyRecipients,
  type NotificationSummary,
  type NotificationResultEntry,
  type NotivPayload,
} from "@/lib/notiv";

export interface DeliverRecipient {
  email: string;
  name?: string;
}

export interface DeliverEmail {
  subject: string;
  text: string;
  html?: string;
}

export interface DeliverOptions {
  recipients: DeliverRecipient[];
  /** Build the Notiv payload for one recipient. */
  buildNotiv: (recipient: DeliverRecipient) => Omit<NotivPayload, "recipient_email">;
  /** Build the email fallback for one recipient. */
  buildEmail: (recipient: DeliverRecipient) => DeliverEmail;
  /** Emails are only sent when an API key exists. */
  emailFallback?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textToHtml(text: string): string {
  return `<div style="font-family:sans-serif;font-size:14px;line-height:1.7;color:#334155;white-space:pre-line">${escapeHtml(
    text
  )}</div>`;
}

let resendClient: Resend | null = null;
function resend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!resendClient) resendClient = new Resend(key);
  return resendClient;
}

/**
 * Deliver notifications through Notiv and, for every recipient Notiv could not
 * reach (typically an email without an active/verified/connected Notiv
 * account), retry the same content by email through Resend.
 *
 * This keeps external meeting guests and non-Notiv users informed without ever
 * failing the booking. Returns one result entry per recipient, annotated with
 * whether the email fallback was used.
 */
export async function deliverNotifications(options: DeliverOptions): Promise<NotificationSummary> {
  const notiv = await notifyRecipients(options.recipients, options.buildNotiv);

  const byEmail = new Map<string, NotificationResultEntry>();
  for (const entry of notiv.results) {
    byEmail.set(entry.email.toLowerCase(), { ...entry });
  }

  const fallbackEnabled = options.emailFallback !== false;
  const client = fallbackEnabled ? resend() : null;

  if (client) {
    for (const entry of notiv.results.filter(r => !r.ok)) {
      const recipient =
        options.recipients.find(r => r.email.toLowerCase() === entry.email.toLowerCase()) ??
        { email: entry.email };
      const template = options.buildEmail(recipient);

      try {
        const result = await client.emails.send({
          from: process.env.RESEND_FROM_EMAIL ?? "no-reply@provaliantgroup.com",
          to: entry.email,
          subject: template.subject,
          text: template.text,
          html: template.html ?? textToHtml(template.text),
        });

        const updated: NotificationResultEntry = result.error
          ? {
              ...entry,
              ok: false,
              error: `Notiv gagal dan email gagal: ${result.error.message}`,
            }
          : {
              ...entry,
              ok: true,
              status: null,
              error: "Notiv gagal — terkirim via email (fallback)",
            };
        byEmail.set(entry.email.toLowerCase(), updated);
      } catch (err) {
        byEmail.set(entry.email.toLowerCase(), {
          ...entry,
          ok: false,
          error: `Notiv gagal dan email gagal: ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
      }
    }
  }

  const results: NotificationResultEntry[] = [...byEmail.values()];
  const failures = results
    .filter(r => !r.ok)
    .map(r => ({ email: r.email, error: r.error ?? "Unknown error" }));

  return {
    sent: results.filter(r => r.ok).length,
    failed: failures.length,
    failures,
    results,
  };
}
