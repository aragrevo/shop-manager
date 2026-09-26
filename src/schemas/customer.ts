import { z } from "zod";
import { emailSchema } from "./auth";

export const customerInputSchema = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(120),
  email: emailSchema.optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .max(30, "Teléfono demasiado largo")
    .regex(/^[0-9+\s()-]*$/, "Teléfono no válido")
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(500).optional(),
});

export type CustomerInput = z.infer<typeof customerInputSchema>;
