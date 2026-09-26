import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { signupSchema, type SignupInput } from "@/schemas/auth";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AuthLayout } from "@/layouts/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await signup(values);
      toast.success("Cuenta creada");
      navigate("/dashboard");
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        setError("email", { message: "Ese email ya está registrado" });
      } else {
        toast.error("No se pudo crear la cuenta");
      }
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthLayout title="Crear cuenta" subtitle="Empieza en un minuto">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <Input
          label="Nombre"
          autoComplete="name"
          required
          error={errors.name?.message}
          {...register("name")}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          required
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Contraseña"
          type="password"
          autoComplete="new-password"
          required
          error={errors.password?.message}
          {...register("password")}
        />
        <Input
          label="Repetir contraseña"
          type="password"
          autoComplete="new-password"
          required
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <Button type="submit" isLoading={submitting} fullWidth>
          Crear cuenta
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-500">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Iniciar sesión
        </Link>
      </p>
    </AuthLayout>
  );
}
