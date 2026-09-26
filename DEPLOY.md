# Deploy

Guía de despliegue en Vercel + Turso, con los "gotchas" que costaron tiempo.

## Stack de despliegue

- Frontend: Vite (SPA) → `dist/`.
- API: Vercel Functions en `api/` (runtime Node), **2 funciones** (`api/[a].ts`,
  `api/[a]/[b].ts`) que delegan en `api/_lib/router.ts`.
- DB: Turso / libSQL vía Drizzle.
- Auth: propia (cookies HTTP-only). En producción `NODE_ENV=production` →
  cookie `Secure`.

## Variables de entorno (Vercel → Production + Preview)

```
DATABASE_URL        = libsql://<db>-<org>.turso.io
DATABASE_AUTH_TOKEN = <token>
SESSION_SECRET      = <32+ bytes aleatorios>   # reservado (sin uso aún)
APP_URL             = https://<proyecto>.vercel.app
```

`.env` local **no** se sube (`.gitignore`). Para desarrollo local usa
`DATABASE_URL="file:local.db"` y `DATABASE_AUTH_TOKEN=""`.

## Base de datos Turso

```bash
turso db create shop-manager
turso db show shop-manager --url
turso db tokens create shop-manager

# aplicar schema (misma carpeta drizzle/)
DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." pnpm db:migrate
```

No ejecutes `pnpm db:seed` en producción (datos demo). Crea la cuenta real desde
`/signup` tras el deploy.

## Deploy

Dashboard: importar repo, framework **Vite**, build `pnpm build`, output `dist`
(ya en `vercel.json`). O CLI: `pnpm dlx vercel` / `pnpm dlx vercel --prod`.

## Gotchas de Vercel (importantes)

1. **Límite de funciones (Hobby: 12).** Cada `.ts` en `api/` es una función.
   Vercel **ignora** archivos/carpetas que empiezan por `_`. Por eso los
   handlers viven en `api/_auth`, `api/_sales`, … y solo hay 2 funciones
   públicas (`api/[a].ts`, `api/[a]/[b].ts`).

2. **No hay catch-all.** `api/[...slug].ts` (catch-all) es **solo de Next.js**;
   en Vercel Functions (Vite) no existe. Los segmentos dinámicos soportados son
   `[a].ts` y encadenados `[a]/[b].ts`. Por eso se reparte en 2 funciones.

3. **`@vercel/node` inyecta `NodeNext`.** Si el `tsconfig.json` **raíz** no
   define `module`, lo fuerza a `NodeNext` (y `strict:false`), exigiendo
   extensiones `.js` en imports. Solución: declarar en el `tsconfig.json` raíz:

   ```jsonc
   "compilerOptions": {
     "module": "ESNext",
     "moduleResolution": "Bundler",
     "target": "ES2022",
     "strict": true,
     "skipLibCheck": true,
     "esModuleInterop": true
   }
   ```

   (ver vercel/vercel#15332). Sin `strict`, la inferencia `$inferInsert` de
   Drizzle pierde columnas opcionales y el build de funciones falla.

4. **Runtime ESM exige extensiones `.js`.** Con `"type": "module"`, Node ESM no
   resuelve imports relativos sin extensión → la función crashea con 500
   (`ERR_MODULE_NOT_FOUND`). Todos los imports relativos en `api/`, `server/` y
   `src/schemas/` llevan `.js` explícito (ver vercel/vercel#14910).

5. **Tipos no exportados en bundle.** `@libsql/client` no expone `Client` según
   el layout pnpm; se usa `ReturnType<typeof createClient>`.

6. **Dev local sin Vercel CLI.** El plugin `vite-api-plugin.ts` (solo `serve`)
   monta `api/_lib/router.ts` bajo `/api`, así `pnpm dev` es funcional.

7. **Typecheck real = `pnpm build`.** `pnpm dev` no typechequea; `tsc -b` sí
   (`noUnusedLocals` rompe el build si dejas imports huérfanos, p. ej. bloques
   JSX comentados).

## Seguridad

- Nunca commitear `.env` (ya ignorado).
- Nunca imprimir secretos en logs/terminal (`cat`/`grep` de `.env`). Si un token
  queda expuesto, **rotarlo**: `turso db tokens invalidate <db>` y crear otro.
- Actualizar el token en Vercel → Env Vars → redeploy.

## Comandos útiles

```bash
pnpm dev            # SPA + API local (plugin)
pnpm build          # typecheck + build
pnpm test           # 24 tests
pnpm db:generate    # tras cambiar server/db/schema.ts
pnpm db:migrate     # local o Turso (según env)
```
