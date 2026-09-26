import { z } from "zod";
import { idSchema, moneyInput, stockInput } from "./common.js";

const skuSchema = z
  .string()
  .trim()
  .max(40, "SKU demasiado largo")
  .regex(/^[A-Za-z0-9._-]*$/, "SKU solo admite letras, números, . _ -")
  .optional()
  .or(z.literal(""));

export const productInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  sku: skuSchema,
  categoryId: idSchema.nullable().optional(),
  description: z.string().trim().max(500).optional(),
  imageUrl: z.string().trim().url("URL de imagen no válida").optional().or(z.literal("")),
  salePrice: moneyInput,
  costPrice: moneyInput,
  stock: stockInput,
  minimumStock: stockInput,
  active: z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export const productFilterSchema = z.object({
  categoryId: idSchema.optional(),
  active: z.enum(["true", "false"]).optional(),
  lowStock: z.enum(["true", "false"]).optional(),
});
