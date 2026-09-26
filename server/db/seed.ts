import { getDb } from "./client.js";
import { hashPassword } from "../auth/password.js";
import {
  categories,
  customers,
  expenses,
  inventoryMovements,
  paymentMethods,
  products,
  saleItems,
  sales,
  storeMembers,
  stores,
  users,
} from "./schema.js";

try {
  process.loadEnvFile();
} catch {
  // .env optional when vars are already injected (CI / production)
}

const db = getDb();

// Deterministic PRNG so seed totals are stable across runs.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20240926);
const pick = <T>(arr: readonly T[]): T => {
  const value = arr[Math.floor(rand() * arr.length)];
  return value as T;
};
const intBetween = (min: number, max: number) =>
  Math.floor(rand() * (max - min + 1)) + min;

const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(intBetween(8, 20), intBetween(0, 59), 0, 0);
  return d;
};

async function reset() {
  // Child-first deletes to respect FK order.
  await db.delete(saleItems);
  await db.delete(sales);
  await db.delete(inventoryMovements);
  await db.delete(expenses);
  await db.delete(products);
  await db.delete(customers);
  await db.delete(categories);
  await db.delete(paymentMethods);
  await db.delete(storeMembers);
  await db.delete(stores);
  await db.delete(users);
}

async function main() {
  await reset();

  const [owner] = await db
    .insert(users)
    .values({
      email: "owner@horno.dev",
      name: "Lucía Ferrer",
      passwordHash: await hashPassword("demo1234"),
    })
    .returning();

  const [store] = await db
    .insert(stores)
    .values({
      ownerId: owner!.id,
      name: "Panadería El Horno",
      taxId: "B12345678",
      currency: "EUR",
      timezone: "Europe/Madrid",
    })
    .returning();

  await db.insert(storeMembers).values([
    { storeId: store!.id, userId: owner!.id, role: "owner" },
  ]);

  const [pmCash, pmCard, pmBizum] = await db
    .insert(paymentMethods)
    .values([
      { storeId: store!.id, name: "Efectivo" },
      { storeId: store!.id, name: "Tarjeta" },
      { storeId: store!.id, name: "Bizum" },
    ])
    .returning();

  const categoryRows = await db
    .insert(categories)
    .values([
      { storeId: store!.id, name: "Panadería", type: "product" },
      { storeId: store!.id, name: "Bebidas", type: "product" },
      { storeId: store!.id, name: "Lácteos", type: "product" },
      { storeId: store!.id, name: "Limpieza", type: "product" },
      { storeId: store!.id, name: "Suministros", type: "expense" },
      { storeId: store!.id, name: "Alquiler y servicios", type: "expense" },
    ])
    .returning();

  const catId = (name: string) =>
    categoryRows.find((c) => c.name === name)!.id;

  const productSeeds: {
    name: string;
    sku: string;
    category: string;
    sale: number;
    cost: number;
    stock: number;
    min: number;
  }[] = [
    { name: "Barra de pan", sku: "PAN-001", category: "Panadería", sale: 120, cost: 45, stock: 180, min: 40 },
    { name: "Baguette", sku: "PAN-002", category: "Panadería", sale: 100, cost: 38, stock: 150, min: 30 },
    { name: "Croissant", sku: "PAN-003", category: "Panadería", sale: 150, cost: 60, stock: 20, min: 25 },
    { name: "Magdalenas (6u)", sku: "PAN-004", category: "Panadería", sale: 320, cost: 140, stock: 60, min: 15 },
    { name: "Tarta de queso", sku: "PAN-005", category: "Panadería", sale: 1400, cost: 620, stock: 4, min: 4 },
    { name: "Agua 1.5L", sku: "BEB-001", category: "Bebidas", sale: 60, cost: 24, stock: 240, min: 60 },
    { name: "Refresco cola", sku: "BEB-002", category: "Bebidas", sale: 120, cost: 48, stock: 160, min: 40 },
    { name: "Zumo naranja 1L", sku: "BEB-003", category: "Bebidas", sale: 180, cost: 85, stock: 70, min: 20 },
    { name: "Café molido 250g", sku: "BEB-004", category: "Bebidas", sale: 420, cost: 210, stock: 45, min: 12 },
    { name: "Leche entera 1L", sku: "LAC-001", category: "Lácteos", sale: 110, cost: 55, stock: 120, min: 30 },
    { name: "Yogur natural (4u)", sku: "LAC-002", category: "Lácteos", sale: 190, cost: 88, stock: 55, min: 15 },
    { name: "Queso curado 250g", sku: "LAC-003", category: "Lácteos", sale: 550, cost: 300, stock: 6, min: 8 },
    { name: "Mantequilla 250g", sku: "LAC-004", category: "Lácteos", sale: 260, cost: 130, stock: 40, min: 10 },
    { name: "Detergente 1L", sku: "LIM-001", category: "Limpieza", sale: 300, cost: 160, stock: 25, min: 6 },
    { name: "Bayetas (3u)", sku: "LIM-002", category: "Limpieza", sale: 220, cost: 95, stock: 0, min: 10 },
  ];

  const productRows = await db
    .insert(products)
    .values(
      productSeeds.map((p) => ({
        storeId: store!.id,
        categoryId: catId(p.category),
        name: p.name,
        sku: p.sku,
        description: `${p.name} — ${p.category}`,
        salePrice: p.sale,
        costPrice: p.cost,
        stock: p.stock,
        minimumStock: p.min,
        active: true,
      })),
    )
    .returning();

  const customerSeeds = [
    "María López", "Carlos Ruiz", "Ana Torres", "Javier Gómez", "Lucía Sánchez",
    "Restaurante La Plaza", "Pedro Martín", "Elena Díaz", "Hotel Miramar", "Sofía Navarro",
  ];
  const customerRows = await db
    .insert(customers)
    .values(
      customerSeeds.map((name, i) => ({
        storeId: store!.id,
        name,
        email: `cliente${i + 1}@example.com`,
        phone: `6${String(intBetween(10000000, 99999999))}`,
        notes: i % 3 === 0 ? "Cliente habitual" : null,
      })),
    )
    .returning();

  const paymentNames = [pmCash!.name, pmCard!.name, pmBizum!.name];
  const soldByProduct = new Map<string, number>();

  for (let i = 0; i < 20; i++) {
    const saleDate = daysAgo(intBetween(0, 89));
    const customer = rand() < 0.8 ? pick(customerRows) : null;
    const itemCount = intBetween(3, 6);
    const chosen = new Set<string>();
    const lineValues: {
      productId: string;
      quantity: number;
      unitPrice: number;
      costPrice: number;
      subtotal: number;
    }[] = [];

    for (let j = 0; j < itemCount; j++) {
      const product = pick(productRows);
      if (chosen.has(product!.id)) continue;
      chosen.add(product!.id);
      const quantity = intBetween(10, 80);
      const unitPrice = product!.salePrice;
      lineValues.push({
        productId: product!.id,
        quantity,
        unitPrice,
        costPrice: product!.costPrice,
        subtotal: quantity * unitPrice,
      });
      soldByProduct.set(
        product!.id,
        (soldByProduct.get(product!.id) ?? 0) + quantity,
      );
    }
    if (lineValues.length === 0) continue;

    const subtotal = lineValues.reduce((s, l) => s + l.subtotal, 0);
    const taxAmount = Math.round(subtotal * 0.1);
    const total = subtotal;

    const [sale] = await db
      .insert(sales)
      .values({
        storeId: store!.id,
        customerId: customer ? customer.id : null,
        total,
        taxAmount,
        paymentMethod: pick(paymentNames),
        status: "completed",
        saleDate,
        notes: null,
      })
      .returning();

    await db
      .insert(saleItems)
      .values(lineValues.map((l) => ({ saleId: sale!.id, ...l })));

    await db.insert(inventoryMovements).values(
      lineValues.map((l) => ({
        storeId: store!.id,
        productId: l.productId,
        type: "sale" as const,
        quantity: -l.quantity,
        referenceId: sale!.id,
        notes: "Venta",
      })),
    );
  }

  // Stock levels stay as configured (seeded). Each unit sold is matched by a
  // purchase/replenishment movement below, so net inventory movement is zero
  // and the stock figures stay realistic and reconciled.

  const describeExpense = [
    { description: "Harina y masa congelada", cat: "Suministros", supplier: "Molinos del Sur" },
    { description: "Factura de luz", cat: "Alquiler y servicios", supplier: "Iberdrola" },
    { description: "Factura de agua", cat: "Alquiler y servicios", supplier: "Canal S.A." },
    { description: "Levadura y mejorantes", cat: "Suministros", supplier: "Química Panadera" },
    { description: "Alquiler del local", cat: "Alquiler y servicios", supplier: "Inmobiliaria Centro" },
    { description: "Bolsas y envases", cat: "Suministros", supplier: "Envases BD" },
    { description: "Mantenimiento horno", cat: "Alquiler y servicios", supplier: "TecnoHornos" },
    { description: "Chocolate y coberturas", cat: "Suministros", supplier: "Chocosur" },
    { description: "Internet y teléfono", cat: "Alquiler y servicios", supplier: "Movistar" },
    { description: "Lácteos mayorista", cat: "Suministros", supplier: "Lactalis Distribución" },
    { description: "Productos de limpieza", cat: "Suministros", supplier: "LimpiaMax" },
    { description: "Seguro del local", cat: "Alquiler y servicios", supplier: "Seguros Ríos" },
    { description: "Azúcar y edulcorantes", cat: "Suministros", supplier: "Dulce Sur" },
    { description: "Mantenimiento cámara frío", cat: "Alquiler y servicios", supplier: "FrioTec" },
    { description: "Etiquetas y tickets", cat: "Suministros", supplier: "Papelería Central" },
  ];

  await db.insert(expenses).values(
    describeExpense.map((e) => {
      const amount = intBetween(800, 30000);
      const taxAmount = Math.round(amount * 0.21);
      return {
        storeId: store!.id,
        categoryId: catId(e.cat),
        supplier: e.supplier,
        description: e.description,
        amount,
        taxAmount,
        paymentMethod: pick(paymentNames),
        expenseDate: daysAgo(intBetween(0, 89)),
        status: (rand() < 0.85 ? "paid" : "pending") as "paid" | "pending",
        notes: null,
      };
    }),
  );

  // Replenishment movements so net stock movement reconciles to zero, plus one
  // manual adjustment. Products with no sales get no replenishment.
  const movementExtras: (typeof inventoryMovements.$inferInsert)[] = [];
  for (const product of productRows) {
    const sold = soldByProduct.get(product!.id) ?? 0;
    if (sold === 0) continue;
    movementExtras.push({
      storeId: store!.id,
      productId: product!.id,
      type: "purchase",
      quantity: sold,
      referenceId: null,
      notes: "Reposición de proveedor",
    });
  }
  movementExtras.push({
    storeId: store!.id,
    productId: productRows[14]!.id,
    type: "adjustment",
    quantity: -5,
    referenceId: null,
    notes: "Merma",
  });
  await db.insert(inventoryMovements).values(movementExtras);

  const salesRows = await db.select().from(sales);
  const expensesRows = await db.select().from(expenses);
  const totalSales = salesRows.reduce((s, x) => s + x.total, 0);
  const totalExpenses = expensesRows
    .filter((x) => x.status !== "cancelled")
    .reduce((s, x) => s + x.amount, 0);

  const fmt = (c: number) => (c / 100).toFixed(2) + " EUR";
  console.log("Seed complete:");
  console.log(`  users:     1`);
  console.log(`  products:  ${productRows.length}`);
  console.log(`  categories:${categoryRows.length}`);
  console.log(`  customers: ${customerRows.length}`);
  console.log(`  sales:     ${salesRows.length} (${fmt(totalSales)})`);
  console.log(`  expenses:  ${expensesRows.length} (${fmt(totalExpenses)})`);
  console.log(`  profit:    ${fmt(totalSales - totalExpenses)}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
