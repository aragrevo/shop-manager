import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { loginSchema, type LoginInput } from "@/schemas/auth";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { AuthLayout } from "@/layouts/AuthLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitting(true);
    try {
      await login(values.email, values.password);
      toast.success("Sesión iniciada");
      navigate("/dashboard");
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setError("password", { message: "Credenciales no válidas" });
      } else {
        toast.error("No se pudo iniciar sesión");
      }
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <AuthLayout title="Iniciar sesión" subtitle="Accede a tu tienda">
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
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
          autoComplete="current-password"
          required
          error={errors.password?.message}
          {...register("password")}
        />
        <Button type="submit" isLoading={submitting} fullWidth>
          Entrar
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-neutral-500">
        ¿No tienes cuenta?{" "}
        <Link to="/signup" className="font-medium text-brand-700 hover:underline">
          Crear una
        </Link>
      </p>
    </AuthLayout>
  );
}
