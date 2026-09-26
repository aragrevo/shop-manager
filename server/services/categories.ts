import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { categories } from "../db/schema";
import { NotFoundError } from "./errors";

export interface CategoryInput {
  name: string;
  type: "product" | "expense";
}

export async function listCategories(
  storeId: string,
  type?: "product" | "expense",
) {
  const conditions = [eq(categories.storeId, storeId)];
  if (type) conditions.push(eq(categories.type, type));
  return getDb()
    .select()
    .from(categories)
    .where(and(...conditions))
    .orderBy(asc(categories.name));
}

export async function createCategory(
  storeId: string,
  input: CategoryInput,
) {
  const [row] = await getDb()
    .insert(categories)
    .values({ storeId, name: input.name, type: input.type })
    .returning();
  if (!row) throw new NotFoundError("No se pudo crear la categoría");
  return row;
}
