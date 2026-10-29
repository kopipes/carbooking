import { prisma } from "@/lib/prisma";

export const MAX_PARTICIPANTS = 100;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ParticipantRecord {
  userId: number | null;
  email: string;
  name: string;
}

export type ParticipantsResult =
  | { ok: true; records: ParticipantRecord[] }
  | { ok: false; error: string };

/**
 * Normalise a meeting participant selection into storable rows.
 *
 * App users are resolved by id (name/email snapshotted from the User table).
 * External emails are accepted as-is and stored with the email as the display
 * name; they only receive Notiv notifications if that email has an active,
 * verified and connected Notiv account.
 */
export async function resolveParticipants(
  userIdsRaw: unknown,
  externalEmailsRaw: unknown
): Promise<ParticipantsResult> {
  const userIds = Array.isArray(userIdsRaw)
    ? [...new Set(userIdsRaw.map(v => parseInt(String(v))).filter(Number.isFinite))]
    : [];

  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds }, active: true },
        select: { id: true, name: true, email: true },
      })
    : [];

  if (users.length !== userIds.length) {
    return { ok: false, error: "Peserta tidak valid atau tidak aktif" };
  }

  const seen = new Set<string>();
  const records: ParticipantRecord[] = [];

  for (const u of users) {
    const key = u.email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    records.push({ userId: u.id, email: u.email, name: u.name });
  }

  const externals = Array.isArray(externalEmailsRaw) ? externalEmailsRaw : [];
  for (const raw of externals) {
    const email = String(raw ?? "").trim().toLowerCase();
    if (!email) continue;
    if (email.length > 254 || !EMAIL_RE.test(email)) {
      return { ok: false, error: `Format email tidak valid: ${email}` };
    }
    if (seen.has(email)) continue;
    seen.add(email);
    records.push({ userId: null, email, name: email });
  }

  if (records.length > MAX_PARTICIPANTS) {
    return { ok: false, error: `Maksimal ${MAX_PARTICIPANTS} peserta` };
  }

  return { ok: true, records };
}
