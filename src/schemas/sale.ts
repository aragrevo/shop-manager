import { z } from "zod";
import {
  dateInput,
  idSchema,
  optionalMoneyInput,
  quantityInput,
} from "./common";

/**
 * Prices/costs are resolved server-side from the product record; the client
 * only chooses product + quantity. Never trust a client-supplied unit price.
 */
export const saleItemInputSchema = z.object({
  productId: idSchema,
  quantity: quantityInput,
});

export const saleInputSchema = z.object({
  customerId: idSchema.nullable().optional(),
  paymentMethod: z.string().trim().max(60).optional(),
  taxAmount: optionalMoneyInput,
  saleDate: dateInput.optional(),
  notes: z.string().trim().max(500).optional(),
  items: z.array(saleItemInputSchema).min(1, "Añade al menos un producto"),
});

export type SaleInput = z.infer<typeof saleInputSchema>;

export const saleFilterSchema = z.object({
  status: z.enum(["completed", "cancelled"]).optional(),
  customerId: idSchema.optional(),
  from: dateInput.optional(),
  to: dateInput.optional(),
});
