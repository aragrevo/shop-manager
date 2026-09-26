import { and, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { storeMembers, stores, users } from "../db/schema";
import { NotFoundError } from "./errors";

export interface StoreSummary {
  id: string;
  name: string;
  currency: string;
  timezone: string;
  role: "owner" | "admin" | "employee";
}

export async function listStoresForUser(userId: string): Promise<StoreSummary[]> {
  const rows = await getDb()
    .select({
      id: stores.id,
      name: stores.name,
      currency: stores.currency,
      timezone: stores.timezone,
      role: storeMembers.role,
    })
    .from(storeMembers)
    .innerJoin(stores, eq(storeMembers.storeId, stores.id))
    .where(eq(storeMembers.userId, userId));
  return rows;
}

export async function getStoreById(storeId: string) {
  const [row] = await getDb().select().from(stores).where(eq(stores.id, storeId));
  if (!row) throw new NotFoundError("Tienda no encontrada");
  return row;
}

export async function getDefaultStoreForUser(
  userId: string,
): Promise<StoreSummary | null> {
  const [row] = await getDb()
    .select({
      id: stores.id,
      name: stores.name,
      currency: stores.currency,
      timezone: stores.timezone,
      role: storeMembers.role,
    })
    .from(storeMembers)
    .innerJoin(stores, eq(storeMembers.storeId, stores.id))
    .where(eq(storeMembers.userId, userId))
    .limit(1);
  return row ?? null;
}

export interface CreateStoreInput {
  name: string;
  taxId?: string;
  currency?: string;
  timezone?: string;
}

export async function createStore(
  userId: string,
  input: CreateStoreInput,
): Promise<StoreSummary> {
  const db = getDb();
  return db.transaction(async (tx) => {
    const [store] = await tx
      .insert(stores)
      .values({
        ownerId: userId,
        name: input.name,
        taxId: input.taxId ?? null,
        currency: input.currency ?? "EUR",
        timezone: input.timezone ?? "Europe/Madrid",
      })
      .returning();
    if (!store) throw new NotFoundError("No se pudo crear la tienda");
    await tx
      .insert(storeMembers)
      .values({ storeId: store.id, userId, role: "owner" });
    return {
      id: store.id,
      name: store.name,
      currency: store.currency,
      timezone: store.timezone,
      role: "owner" as const,
    };
  });
}

export async function updateStoreSettings(
  storeId: string,
  input: Partial<{ name: string; taxId: string | null; currency: string; timezone: string }>,
) {
  const [row] = await getDb()
    .update(stores)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(stores.id, storeId))
    .returning();
  if (!row) throw new NotFoundError("Tienda no encontrada");
  return row;
}

export async function listStoreMembers(storeId: string) {
  return getDb()
    .select({
      id: storeMembers.id,
      userId: storeMembers.userId,
      name: users.name,
      email: users.email,
      role: storeMembers.role,
      createdAt: storeMembers.createdAt,
    })
    .from(storeMembers)
    .innerJoin(users, eq(storeMembers.userId, users.id))
    .where(eq(storeMembers.storeId, storeId));
}

export async function addStoreMember(
  storeId: string,
  userId: string,
  role: "owner" | "admin" | "employee",
) {
  const [row] = await getDb()
    .insert(storeMembers)
    .values({ storeId, userId, role })
    .returning();
  return row;
}

export async function isStoreOwner(
  storeId: string,
  userId: string,
): Promise<boolean> {
  const [row] = await getDb()
    .select({ id: storeMembers.id })
    .from(storeMembers)
    .where(
      and(
        eq(storeMembers.storeId, storeId),
        eq(storeMembers.userId, userId),
        eq(storeMembers.role, "owner"),
      ),
    )
    .limit(1);
  return Boolean(row);
}
