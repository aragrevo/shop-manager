import { createHash, randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { sessions, users } from "../db/schema";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const REFRESH_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 15; // refresh when < 15 days left

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

export interface ActiveSession {
  id: string;
  userId: string;
  expiresAt: Date;
}

export interface SessionValidationResult {
  session: ActiveSession | null;
  user: SessionUser | null;
}

/** Opaque session token stored in the cookie; only its hash is persisted. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const id = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await getDb().insert(sessions).values({ id, userId, expiresAt });
  return { token, expiresAt };
}

export async function validateSessionToken(
  token: string,
): Promise<SessionValidationResult> {
  if (!token) return { session: null, user: null };

  const db = getDb();
  const id = hashToken(token);
  const rows = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id));

  const row = rows[0];
  if (!row) return { session: null, user: null };

  if (Date.now() >= row.session.expiresAt.getTime()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return { session: null, user: null };
  }

  let expiresAt = row.session.expiresAt;
  if (expiresAt.getTime() - Date.now() < REFRESH_THRESHOLD_MS) {
    expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
  }

  return {
    session: {
      id: row.session.id,
      userId: row.session.userId,
      expiresAt,
    },
    user: {
      id: row.user.id,
      email: row.user.email,
      name: row.user.name,
      avatarUrl: row.user.avatarUrl,
    },
  };
}

export async function invalidateSession(token: string): Promise<void> {
  if (!token) return;
  await getDb().delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.userId, userId));
}
