/**
 * Notiv integration client.
 *
 * Notiv stores notifications in the recipient's inbox (email is only the
 * recipient identifier; Notiv does not forward content by email). A recipient
 * must be active, email-verified, and connected to this integration, otherwise
 * the API answers 422.
 *
 * The API key is server-side only — never import this from a client component.
 */

const DEFAULT_BASE_URL = "https://notiv.provaliantgroup.com";
const REQUEST_TIMEOUT_MS = 5000;
const MAX_ATTEMPTS = 3;

export interface NotivPayload {
  recipient_email: string;
  title: string;
  message: string;
  type?: string;
  action_url?: string;
  idempotency_key?: string;
  sensitive?: boolean;
  expires_at?: string;
}

export interface NotivResult {
  ok: boolean;
  status: number | null;
  error?: string;
}

function truncate(value: string, max: number): string {
  return value.length > max ? value.slice(0, max) : value;
}

function baseUrl(): string {
  return (process.env.NOTIV_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Send one notification. Retries 429 and 5xx with exponential backoff; never
 * retries 400, 401, 409 or 422 because those need a payload/recipient fix.
 * Failures are returned, not thrown — callers must not break a booking on them.
 */
export async function sendNotification(payload: NotivPayload): Promise<NotivResult> {
  const apiKey = process.env.NOTIV_API_KEY;
  if (!apiKey) {
    return { ok: false, status: null, error: "NOTIV_API_KEY is not configured" };
  }

  const body = JSON.stringify({
    ...payload,
    title: truncate(payload.title, 200),
    message: truncate(payload.message, 5000),
  });

  let lastError = "Unknown error";

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(`${baseUrl()}/api/v1/notifications`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
        signal: controller.signal,
      });

      if (res.ok) {
        return { ok: true, status: res.status };
      }

      const retryable = res.status === 429 || res.status >= 500;
      let message = `Notiv responded ${res.status}`;
      try {
        const data = await res.json();
        if (data?.error) message = String(data.error);
      } catch {
        // response had no JSON body
      }
      lastError = message;

      if (!retryable) return { ok: false, status: res.status, error: lastError };
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timer);
    }

    if (attempt < MAX_ATTEMPTS) await sleep(500 * 2 ** (attempt - 1));
  }

  return { ok: false, status: null, error: lastError };
}

export interface RecipientNotification {
  email: string;
  label?: string;
}

export interface NotificationResultEntry {
  email: string;
  ok: boolean;
  status: number | null;
  error?: string;
}

export interface NotificationSummary {
  sent: number;
  failed: number;
  failures: { email: string; error: string }[];
  results: NotificationResultEntry[];
}

/**
 * Send the same notification to several recipients (one request each, as Notiv
 * requires). Runs with bounded concurrency to stay well under the rate limit
 * and never throws.
 */
export async function notifyRecipients(
  recipients: RecipientNotification[],
  build: (recipient: RecipientNotification) => Omit<NotivPayload, "recipient_email">,
  concurrency = 5
): Promise<NotificationSummary> {
  const unique = new Map<string, RecipientNotification>();
  for (const r of recipients) {
    const email = r.email.trim().toLowerCase();
    if (!email) continue;
    if (!unique.has(email)) unique.set(email, { ...r, email });
  }

  const queue = [...unique.values()];
  const failures: NotificationSummary["failures"] = [];
  const results: NotificationResultEntry[] = [];
  let sent = 0;

  async function worker() {
    for (;;) {
      const recipient = queue.shift();
      if (!recipient) return;
      const result = await sendNotification({
        recipient_email: recipient.email,
        ...build(recipient),
      });
      results.push({
        email: recipient.email,
        ok: result.ok,
        status: result.status,
        error: result.error,
      });
      if (result.ok) sent++;
      else failures.push({ email: recipient.email, error: result.error ?? "Unknown error" });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, () => worker())
  );

  return { sent, failed: failures.length, failures, results };
}
