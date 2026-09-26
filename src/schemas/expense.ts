import { z } from "zod";
import { dateInput, idSchema, moneyInput, optionalMoneyInput } from "./common";

export const expenseStatusSchema = z.enum(["pending", "paid", "cancelled"]);
export type ExpenseStatus = z.infer<typeof expenseStatusSchema>;

export const expenseInputSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "El concepto es obligatorio")
    .max(200, "Concepto demasiado largo"),
  categoryId: idSchema.nullable().optional(),
  supplier: z.string().trim().max(120).optional(),
  amount: moneyInput,
  taxAmount: optionalMoneyInput,
  paymentMethod: z.string().trim().max(60).optional(),
  expenseDate: dateInput.optional(),
  status: expenseStatusSchema.default("paid"),
  notes: z.string().trim().max(500).optional(),
  receiptUrl: z.string().trim().url("URL no válida").optional().or(z.literal("")),
});

export type ExpenseInput = z.infer<typeof expenseInputSchema>;

export const expenseFilterSchema = z.object({
  status: expenseStatusSchema.optional(),
  categoryId: idSchema.optional(),
  from: dateInput.optional(),
  to: dateInput.optional(),
});
