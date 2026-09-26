import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/libsql/migrator";
import { getDb } from "../server/db/client";
import { createUser } from "../server/auth/user";
import { createStore } from "../server/services/stores";
import { createProduct } from "../server/services/products";

// Point the shared client at a throwaway local libSQL file before any query.
if (!process.env.TEST_DATABASE_URL) {
  const dir = mkdtempSync(join(tmpdir(), "shop-manager-test-"));
  process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;
} else {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
delete process.env.DATABASE_AUTH_TOKEN;

export async function migrateTestDb(): Promise<void> {
  await migrate(getDb(), { migrationsFolder: "./drizzle" });
}

export async function makeUserWithStore(name = "Test User") {
  const email = `${name.toLowerCase().replace(/\s+/g, ".")}.${Date.now()}.${Math.floor(
    Math.random() * 1e6,
  )}@test.dev`;
  const user = await createUser({ name, email, password: "password123" });
  const store = await createStore(user.id, { name: `${name} Store` });
  return { user, store };
}

export async function makeProduct(
  storeId: string,
  overrides: Partial<{
    name: string;
    salePrice: number;
    costPrice: number;
    stock: number;
    minimumStock: number;
    sku: string | null;
    active: boolean;
  }> = {},
) {
  return createProduct(storeId, {
    name: overrides.name ?? "Producto de prueba",
    sku: overrides.sku ?? undefined,
    categoryId: null,
    description: "",
    imageUrl: "",
    salePrice: overrides.salePrice ?? 1000,
    costPrice: overrides.costPrice ?? 400,
    stock: overrides.stock ?? 10,
    minimumStock: overrides.minimumStock ?? 0,
    active: overrides.active ?? true,
  });
}
