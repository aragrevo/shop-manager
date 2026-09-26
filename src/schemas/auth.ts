import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .min(1, "El email es obligatorio")
  .email("Email no válido")
  .toLowerCase();

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña es demasiado larga");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    name: z.string().trim().min(2, "El nombre es obligatorio").max(80),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export type SignupInput = z.infer<typeof signupSchema>;
