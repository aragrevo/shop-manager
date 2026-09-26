import { eq } from "drizzle-orm";
import { getDb } from "../db/client.js";
import { users } from "../db/schema.js";
import { hashPassword, verifyPassword } from "./password.js";
import type { SessionUser } from "./session.js";

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
}

function toSessionUser(row: {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}): SessionUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    avatarUrl: row.avatarUrl,
  };
}

export async function createUser(input: CreateUserInput): Promise<SessionUser> {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const [row] = await getDb()
    .insert(users)
    .values({ email, name: input.name.trim(), passwordHash })
    .returning();
  if (!row) throw new Error("Failed to create user");
  return toSessionUser(row);
}

export async function getUserByEmail(
  email: string,
): Promise<{ user: SessionUser; passwordHash: string } | null> {
  const [row] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()));
  if (!row) return null;
  return { user: toSessionUser(row), passwordHash: row.passwordHash };
}

export async function verifyUserCredentials(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  const found = await getUserByEmail(email);
  if (!found) return null;
  const valid = await verifyPassword(found.passwordHash, password);
  return valid ? found.user : null;
}
