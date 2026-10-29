import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { notifyRecipientsMock, sendMock } = vi.hoisted(() => ({
  notifyRecipientsMock: vi.fn(),
  sendMock: vi.fn(),
}));

vi.mock("@/lib/notiv", () => ({
  notifyRecipients: notifyRecipientsMock,
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

import { deliverNotifications } from "@/lib/deliver";

const originalKey = process.env.RESEND_API_KEY;

function notivFailure(email = "guest@example.com") {
  return {
    sent: 0,
    failed: 1,
    failures: [{ email, error: "recipient not connected" }],
    results: [{ email, ok: false, status: 422, error: "recipient not connected" }],
  };
}

const options = {
  recipients: [{ email: "guest@example.com", name: "Guest" }],
  buildNotiv: () => ({ title: "T", message: "M", type: "meeting" }),
  buildEmail: () => ({ subject: "T", text: "M" }),
};

describe("deliverNotifications", () => {
  beforeEach(() => {
    notifyRecipientsMock.mockReset();
    sendMock.mockReset();
    process.env.RESEND_API_KEY = "re_test";
  });

  afterEach(() => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
  });

  it("does not send email when Notiv succeeds", async () => {
    notifyRecipientsMock.mockResolvedValue({
      sent: 1,
      failed: 0,
      failures: [],
      results: [{ email: "guest@example.com", ok: true, status: 202 }],
    });

    const summary = await deliverNotifications(options);

    expect(summary.sent).toBe(1);
    expect(summary.failed).toBe(0);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("falls back to email when Notiv fails", async () => {
    notifyRecipientsMock.mockResolvedValue(notivFailure());
    sendMock.mockResolvedValue({ data: { id: "1" }, error: null });

    const summary = await deliverNotifications(options);

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(summary.sent).toBe(1);
    expect(summary.failed).toBe(0);
    expect(summary.results[0].ok).toBe(true);
    expect(summary.results[0].error).toMatch(/fallback/i);
  });

  it("reports failure when both Notiv and email fail", async () => {
    notifyRecipientsMock.mockResolvedValue(notivFailure());
    sendMock.mockResolvedValue({ data: null, error: { message: "domain not verified" } });

    const summary = await deliverNotifications(options);

    expect(summary.failed).toBe(1);
    expect(summary.results[0].ok).toBe(false);
    expect(summary.results[0].error).toMatch(/domain not verified/);
  });

  it("skips the email fallback when no Resend key is configured", async () => {
    delete process.env.RESEND_API_KEY;
    notifyRecipientsMock.mockResolvedValue(notivFailure());

    const summary = await deliverNotifications(options);

    expect(sendMock).not.toHaveBeenCalled();
    expect(summary.failed).toBe(1);
  });
});
