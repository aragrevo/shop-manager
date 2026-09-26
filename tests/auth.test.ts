import { beforeAll, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../server/auth/password";
import { createUser, getUserByEmail, verifyUserCredentials } from "../server/auth/user";
import {
  createSession,
  invalidateSession,
  validateSessionToken,
} from "../server/auth/session";
import { migrateTestDb } from "./helpers";

beforeAll(async () => {
  await migrateTestDb();
});

describe("password hashing", () => {
  it("verifies a correct password", async () => {
    const hash = await hashPassword("Sup3r-secret");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(await verifyPassword(hash, "Sup3r-secret")).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("Sup3r-secret");
    expect(await verifyPassword(hash, "wrong")).toBe(false);
  });

  it("never stores the plaintext password", async () => {
    const hash = await hashPassword("Sup3r-secret");
    expect(hash).not.toContain("Sup3r-secret");
  });

  it("rejects a malformed hash", async () => {
    expect(await verifyPassword("not-a-hash", "anything")).toBe(false);
  });
});

describe("user authentication", () => {
  it("creates a user and authenticates with valid credentials", async () => {
    const email = `auth.${Date.now()}@test.dev`;
    const created = await createUser({ name: "Ana", email, password: "password123" });
    expect(created.email).toBe(email.toLowerCase());

    const ok = await verifyUserCredentials(email, "password123");
    expect(ok?.id).toBe(created.id);

    const bad = await verifyUserCredentials(email, "wrong-password");
    expect(bad).toBeNull();
  });

  it("does not leak a password hash through getUserByEmail callers", async () => {
    const email = `hash.${Date.now()}@test.dev`;
    await createUser({ name: "Beto", email, password: "password123" });
    const found = await getUserByEmail(email);
    expect(found?.passwordHash.startsWith("scrypt$")).toBe(true);
  });
});

describe("sessions", () => {
  it("validates a fresh session and rejects a garbage token", async () => {
    const email = `sess.${Date.now()}@test.dev`;
    const user = await createUser({ name: "Carla", email, password: "password123" });

    const { token } = await createSession(user.id);
    const valid = await validateSessionToken(token);
    expect(valid.user?.id).toBe(user.id);

    const garbage = await validateSessionToken("garbage-token");
    expect(garbage.user).toBeNull();
    expect(garbage.session).toBeNull();
  });

  it("invalidates a session on logout", async () => {
    const email = `logout.${Date.now()}@test.dev`;
    const user = await createUser({ name: "Dani", email, password: "password123" });

    const { token } = await createSession(user.id);
    await invalidateSession(token);
    const after = await validateSessionToken(token);
    expect(after.session).toBeNull();
    expect(after.user).toBeNull();
  });
});
