import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendNotification, notifyRecipients } from "../lib/notiv";

function okResponse(status = 202) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({ id: 1, duplicate: false, status: "stored" }),
  } as unknown as Response;
}

function errorResponse(status: number, error: string) {
  return {
    ok: false,
    status,
    json: async () => ({ error }),
  } as unknown as Response;
}

describe("notiv client", () => {
  const originalKey = process.env.NOTIV_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NOTIV_API_KEY = "nv_test_key";
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.NOTIV_API_KEY;
    else process.env.NOTIV_API_KEY = originalKey;
    vi.restoreAllMocks();
  });

  it("fails without calling Notiv when the API key is missing", async () => {
    delete process.env.NOTIV_API_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendNotification({
      recipient_email: "a@example.com",
      title: "t",
      message: "m",
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("NOTIV_API_KEY");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a single request on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(okResponse());
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendNotification({
      recipient_email: "a@example.com",
      title: "t",
      message: "m",
    });

    expect(result).toEqual({ ok: true, status: 202 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer nv_test_key");
  });

  it("does not retry 422 (recipient not connected)", async () => {
    const fetchMock = vi.fn().mockResolvedValue(errorResponse(422, "recipient not connected"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendNotification({
      recipient_email: "a@example.com",
      title: "t",
      message: "m",
    });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(422);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries 429 and then succeeds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(errorResponse(429, "rate limited"))
      .mockResolvedValueOnce(okResponse(202));
    vi.stubGlobal("fetch", fetchMock);

    const result = await sendNotification({
      recipient_email: "a@example.com",
      title: "t",
      message: "m",
    });

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("deduplicates recipients case-insensitively and reports failures", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(okResponse())
      .mockResolvedValueOnce(errorResponse(422, "not connected"));
    vi.stubGlobal("fetch", fetchMock);

    const summary = await notifyRecipients(
      [{ email: "a@example.com" }, { email: "A@Example.com" }, { email: "b@example.com" }],
      r => ({ title: "t", message: `to ${r.email}`, type: "meeting" })
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(summary.sent).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.failures[0].email).toBe("b@example.com");
  });
});
