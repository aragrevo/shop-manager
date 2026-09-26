import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { storeMembers } from "../db/schema";

export type Role = "owner" | "admin" | "employee";

const ROLE_RANK: Record<Role, number> = {
  employee: 1,
  admin: 2,
  owner: 3,
};

export class AuthorizationError extends Error {
  constructor(message = "Not authorized") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function roleAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export interface Membership {
  storeId: string;
  userId: string;
  role: Role;
}

export async function getMembership(
  userId: string,
  storeId: string,
): Promise<Membership | null> {
  const [row] = await getDb()
    .select()
    .from(storeMembers)
    .where(
      and(
        eq(storeMembers.storeId, storeId),
        eq(storeMembers.userId, userId),
      ),
    );
  if (!row) return null;
  return { storeId: row.storeId, userId: row.userId, role: row.role };
}

/**
 * Central store-access gate. Never trust a storeId from the client without
 * passing it through here: confirms the user is a member and has enough role.
 */
export async function requireStoreAccess(
  userId: string,
  storeId: string,
  minimumRole: Role = "employee",
): Promise<Membership> {
  const membership = await getMembership(userId, storeId);
  if (!membership) {
    throw new AuthorizationError("You do not have access to this store");
  }
  if (!roleAtLeast(membership.role, minimumRole)) {
    throw new AuthorizationError("Insufficient permissions for this action");
  }
  return membership;
}

/**
 * Confirms a loaded resource actually belongs to the store the user was
 * authorized for. Guards against cross-store access via swapped IDs.
 */
export function assertSameStore(
  resourceStoreId: string,
  authorizedStoreId: string,
): void {
  if (resourceStoreId !== authorizedStoreId) {
    throw new AuthorizationError("Resource does not belong to this store");
  }
}
