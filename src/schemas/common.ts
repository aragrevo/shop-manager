import { z } from "zod";
import { parseMoney } from "../lib/money";

export const idSchema = z.string().uuid("Identificador inválido");

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(120).optional(),
  sort: z.string().trim().max(60).optional(),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationInput = z.infer<typeof paginationSchema>;

export const periodSchema = z.enum(["today", "7d", "30d", "3m", "12m"]);
export type Period = z.infer<typeof periodSchema>;

/** User-entered amount -> integer minor units (cents). */
export const moneyInput = z
  .string()
  .trim()
  .min(1, "Importe obligatorio")
  .transform((value, ctx) => {
    const cents = parseMoney(value);
    if (cents === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Importe inválido" });
      return z.NEVER;
    }
    return cents;
  })
  .refine((cents) => cents >= 0, "El importe no puede ser negativo");

export const optionalMoneyInput = z
  .string()
  .trim()
  .optional()
  .transform((value, ctx) => {
    if (value === undefined || value === "") return 0;
    const cents = parseMoney(value);
    if (cents === null) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Importe inválido" });
      return z.NEVER;
    }
    return cents;
  })
  .refine((cents) => cents >= 0, "El importe no puede ser negativo");

export const quantityInput = z.coerce
  .number({ invalid_type_error: "Cantidad inválida" })
  .int("Cantidad debe ser entera")
  .positive("Cantidad debe ser mayor que 0");

export const stockInput = z.coerce
  .number({ invalid_type_error: "Stock inválido" })
  .int("Stock debe ser entero")
  .min(0, "Stock no puede ser negativo");

export const dateInput = z.coerce.date();
