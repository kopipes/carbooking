import { describe, it, expect, vi, beforeEach } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany } },
}));

import { resolveParticipants, MAX_PARTICIPANTS } from "@/lib/participants";

const APP_USER = { id: 7, name: "Sari Dewi", email: "sari@company.com" };

describe("resolveParticipants", () => {
  beforeEach(() => {
    findMany.mockReset();
    findMany.mockResolvedValue([APP_USER]);
  });

  it("resolves app users into snapshotted rows", async () => {
    const result = await resolveParticipants([7], []);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toEqual([
      { userId: 7, email: "sari@company.com", name: "Sari Dewi" },
    ]);
  });

  it("rejects user ids that are missing or inactive", async () => {
    findMany.mockResolvedValue([]);
    const result = await resolveParticipants([999], []);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/tidak valid/i);
  });

  it("accepts external emails and lowercases them", async () => {
    const result = await resolveParticipants([], ["Guest@Example.COM"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toEqual([
      { userId: null, email: "guest@example.com", name: "guest@example.com" },
    ]);
  });

  it("rejects invalid external emails", async () => {
    const result = await resolveParticipants([], ["bukan-email"]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/tidak valid/i);
  });

  it("does not duplicate an external email that is already an app user", async () => {
    const result = await resolveParticipants([7], ["SARI@company.com"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toHaveLength(1);
    expect(result.records[0].userId).toBe(7);
  });

  it("deduplicates repeated external emails", async () => {
    const result = await resolveParticipants([], ["a@x.com", "A@X.com", "a@x.com"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.records).toHaveLength(1);
  });

  it("caps the total number of participants", async () => {
    const many = Array.from({ length: MAX_PARTICIPANTS + 1 }, (_, i) => `u${i}@x.com`);
    const result = await resolveParticipants([], many);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/Maksimal/i);
  });
});
