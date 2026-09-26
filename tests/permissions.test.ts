import { beforeAll, describe, expect, it } from "vitest";
import { AuthorizationError, assertSameStore, requireStoreAccess } from "../server/auth/permissions";
import { addStoreMember } from "../server/services/stores";
import { createUser } from "../server/auth/user";
import { makeUserWithStore, migrateTestDb } from "./helpers";

beforeAll(async () => {
  await migrateTestDb();
});

describe("store access control", () => {
  it("allows a member and returns their role", async () => {
    const { user, store } = await makeUserWithStore("Perm Owner");
    const membership = await requireStoreAccess(user.id, store.id, "employee");
    expect(membership.role).toBe("owner");
  });

  it("denies a user who is not a member of the store", async () => {
    const { store } = await makeUserWithStore("Perm Store");
    const outsider = await createUser({
      name: "Outsider",
      email: `outsider.${Date.now()}@test.dev`,
      password: "password123",
    });

    await expect(requireStoreAccess(outsider.id, store.id)).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("enforces the minimum role", async () => {
    const { store } = await makeUserWithStore("Perm Roles");
    const employee = await createUser({
      name: "Employee",
      email: `employee.${Date.now()}@test.dev`,
      password: "password123",
    });
    await addStoreMember(store.id, employee.id, "employee");

    // employee passes for employee-level, fails for admin-level
    await expect(requireStoreAccess(employee.id, store.id, "employee")).resolves.toBeDefined();
    await expect(requireStoreAccess(employee.id, store.id, "admin")).rejects.toBeInstanceOf(
      AuthorizationError,
    );
  });

  it("detects cross-store access attempts on a loaded resource", () => {
    expect(() => assertSameStore("store-b", "store-a")).toThrow(AuthorizationError);
    expect(() => assertSameStore("store-a", "store-a")).not.toThrow();
  });
});
