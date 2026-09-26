# Shop Manager

Aplicación web de gestión para tiendas pequeñas: contabilidad básica, ventas,
gastos, inventario, clientes e informes. Funcional (no es un mockup).

## Stack

- **Frontend:** React + TypeScript + Vite + Tailwind CSS
- **UI:** componentes propios (sin shadcn/ui), Lucide React, Recharts,
  React Hook Form + Zod
- **Backend:** funciones serverless en `api/` (Vercel Functions, runtime Node)
- **Base de datos:** Turso / libSQL (SQLite) mediante **Drizzle ORM** + drizzle-kit
- **Auth:** propia (scrypt + sesiones opacas en Turso, cookies HTTP-only)
- **Fechas:** date-fns (+ `@date-fns/tz`), zona horaria por tienda
- **Dinero:** enteros en unidades mínimas (céntimos); nunca coma flotante
- **Gestor de paquetes:** pnpm (no npm, no yarn)

## Requisitos

- Node >= 20
- pnpm >= 9

## Variables de entorno

Copia `.env.example` a `.env` y rellena:

```
DATABASE_URL=
DATABASE_AUTH_TOKEN=
SESSION_SECRET=
APP_URL=
```

- Desarrollo local: `DATABASE_URL="file:local.db"` y `DATABASE_AUTH_TOKEN` vacío.
- Producción (Turso): `DATABASE_URL=libsql://...` y `DATABASE_AUTH_TOKEN=<token>`.
- Los secretos nunca se envían al navegador; solo se usan en código de servidor.

## Scripts

```bash
pnpm dev          # servidor de desarrollo (SPA)
pnpm build        # typecheck + build de producción
pnpm start        # previsualiza el build
pnpm lint         # ESLint
pnpm typecheck    # TypeScript estricto (tsc -b)
pnpm test         # tests (Vitest)
pnpm db:generate  # genera migraciones desde el schema Drizzle
pnpm db:migrate   # aplica migraciones
pnpm db:push      # empuja el schema (solo desarrollo)
pnpm db:seed      # datos demo realistas
```

## Desarrollo local

La API vive en `api/` (funciones serverless). Para ejercitarla en local usa la
CLI de Vercel, que sirve a la vez el frontend de Vite y las funciones:

```bash
pnpm dlx vercel dev
```

Solo el frontend, sin API:

```bash
pnpm dev
```

## Base de datos

```bash
pnpm db:generate   # tras cambiar server/db/schema.ts
pnpm db:migrate    # aplica en local (file:local.db) o en Turso
pnpm db:seed       # datos demo (15 productos, 6 categorías, 10 clientes,
                   # 20 ventas, 15 gastos, movimientos de inventario)
```

Todas las modificaciones de esquema se hacen por migraciones de Drizzle. No se
edita la base de datos de producción a mano.

## Despliegue en Vercel

1. Importa el repositorio en Vercel.
2. Configura las variables de entorno (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`,
   `SESSION_SECRET`, `APP_URL`).
3. Build: `pnpm build`. Funciones: `api/`. Rewrites en `vercel.json` (SPA).

## Arquitectura

```
api/                 funciones serverless (HTTP)
server/
  auth/              password, session, user, permissions, middleware
  db/                client, schema, seed
  services/          sales, expenses, products, customers, reports, dashboard...
src/
  components/ui/     componentes reutilizables propios
  components/{sales,expenses,products,customers}/  componentes de dominio
  pages/             páginas
  layouts/           layouts (App, Auth)
  hooks/             useAsync
  lib/               api, money, date, cn
  context/           AuthContext
  schemas/           validación Zod (compartida cliente/servidor)
  routes/            router
  types/             tipos
tests/               Vitest (auth, permisos, ventas, stock, gastos, beneficio)
```

## Seguridad

- Aislamiento por tienda: cada operación comprueba sesión válida, pertenencia a
  la tienda, rol suficiente y que el recurso pertenece a esa tienda.
- Nunca se confía en un `store_id` enviado por el cliente.
- Contraseñas con scrypt; sesiones opacas (solo se guarda el hash del token).
- Cookies HTTP-only, `SameSite=Lax`, `Secure` en producción.
