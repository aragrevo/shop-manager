import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db/client";
import { inventoryMovements, products } from "../server/db/schema";
import { cancelSale, createSale, getSale } from "../server/services/sales";
import { ConflictError, NotFoundError } from "../server/services/errors";
import { makeProduct, makeUserWithStore, migrateTestDb } from "./helpers";

beforeAll(async () => {
  await migrateTestDb();
});

describe("createSale", () => {
  it("computes the total from server-side prices and decrements stock", async () => {
    const { store } = await makeUserWithStore("Sale One");
    const product = await makeProduct(store.id, { salePrice: 250, costPrice: 100, stock: 10 });

    const result = await createSale(store.id, {
      items: [{ productId: product.id, quantity: 3 }],
      taxAmount: 0,
    });

    expect(result.total).toBe(750);

    const [updated] = await getDb()
      .select()
      .from(products)
      .where(eq(products.id, product.id));
    expect(updated?.stock).toBe(7);

    const movements = await getDb()
      .select()
      .from(inventoryMovements)
      .where(eq(inventoryMovements.referenceId, result.saleId));
    expect(movements).toHaveLength(1);
    expect(movements[0]?.type).toBe("sale");
    expect(movements[0]?.quantity).toBe(-3);
  });

  it("handles multiple products in one sale", async () => {
    const { store } = await makeUserWithStore("Sale Multi");
    const a = await makeProduct(store.id, { salePrice: 100, stock: 5 });
    const b = await makeProduct(store.id, { salePrice: 300, stock: 5 });

    const result = await createSale(store.id, {
      items: [
        { productId: a.id, quantity: 2 },
        { productId: b.id, quantity: 1 },
      ],
      taxAmount: 50,
    });

    expect(result.total).toBe(2 * 100 + 300 + 50);
    const detail = await getSale(store.id, result.saleId);
    expect(detail.items).toHaveLength(2);
  });

  it("rejects a sale when stock is insufficient", async () => {
    const { store } = await makeUserWithStore("Sale NoStock");
    const product = await makeProduct(store.id, { stock: 2 });

    await expect(
      createSale(store.id, { items: [{ productId: product.id, quantity: 5 }], taxAmount: 0 }),
    ).rejects.toBeInstanceOf(ConflictError);

    const [unchanged] = await getDb()
      .select()
      .from(products)
      .where(eq(products.id, product.id));
    expect(unchanged?.stock).toBe(2);
  });

  it("rejects an unknown product", async () => {
    const { store } = await makeUserWithStore("Sale Unknown");
    await expect(
      createSale(store.id, {
        items: [{ productId: crypto.randomUUID(), quantity: 1 }],
        taxAmount: 0,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects a product from another store", async () => {
    const { store } = await makeUserWithStore("Sale StoreA");
    const { store: otherStore } = await makeUserWithStore("Sale StoreB");
    const foreignProduct = await makeProduct(otherStore.id, { stock: 10 });

    await expect(
      createSale(store.id, {
        items: [{ productId: foreignProduct.id, quantity: 1 }],
        taxAmount: 0,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("rejects an inactive product", async () => {
    const { store } = await makeUserWithStore("Sale Inactive");
    const product = await makeProduct(store.id, { stock: 10, active: false });

    await expect(
      createSale(store.id, { items: [{ productId: product.id, quantity: 1 }], taxAmount: 0 }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});

describe("cancelSale", () => {
  it("restores stock and blocks a double cancellation", async () => {
    const { store } = await makeUserWithStore("Cancel One");
    const product = await makeProduct(store.id, { stock: 10 });
    const result = await createSale(store.id, {
      items: [{ productId: product.id, quantity: 4 }],
      taxAmount: 0,
    });

    await cancelSale(store.id, result.saleId);
    const [restored] = await getDb()
      .select()
      .from(products)
      .where(eq(products.id, product.id));
    expect(restored?.stock).toBe(10);

    await expect(cancelSale(store.id, result.saleId)).rejects.toBeInstanceOf(ConflictError);
  });
});
