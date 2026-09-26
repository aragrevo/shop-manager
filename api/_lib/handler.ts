import type { VercelRequest, VercelResponse } from "@vercel/node";
import { ZodError } from "zod";
import {
  getRequestContext,
  UnauthorizedError,
} from "../../server/auth/middleware.js";
import {
  AuthorizationError,
  requireStoreAccess,
  type Role,
} from "../../server/auth/permissions.js";
import type { SessionUser } from "../../server/auth/session.js";
import { getDefaultStoreForUser } from "../../server/services/stores.js";
import { AppError } from "../../server/services/errors.js";

export interface Ctx {
  req: VercelRequest;
  res: VercelResponse;
  user: SessionUser | null;
  storeId: string | null;
  role: Role | null;
  body: unknown;
}

export type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

interface HandlerOptions {
  auth?: boolean;
  store?: boolean;
  minRole?: Role;
}

type Endpoint = (ctx: Ctx) => Promise<unknown> | unknown;

function firstValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export function toRequest(req: VercelRequest): Request {
  const host = req.headers.host ?? "localhost";
  const url = `http://${host}${req.url ?? "/"}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value === undefined) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  return new Request(url, { headers });
}

function sendError(res: VercelResponse, error: unknown): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: "Datos no válidos",
      code: "validation_error",
      issues: error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }
  if (error instanceof UnauthorizedError) {
    res.status(401).json({ error: error.message, code: "unauthorized" });
    return;
  }
  if (error instanceof AuthorizationError) {
    res.status(403).json({ error: error.message, code: "forbidden" });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  console.error("[api] unhandled error", error);
  res.status(500).json({ error: "Error interno del servidor", code: "internal" });
}

export function handler(
  methods: Partial<Record<Method, Endpoint>>,
  options: HandlerOptions = {},
) {
  const { auth = true, store = false, minRole = "employee" } = options;

  return async function (req: VercelRequest, res: VercelResponse) {
    try {
      const method = (req.method ?? "GET").toUpperCase() as Method;
      const endpoint = methods[method];
      if (!endpoint) {
        res.status(405).json({ error: "Método no permitido", code: "method_not_allowed" });
        return;
      }

      let user: SessionUser | null = null;
      if (auth) {
        const context = await getRequestContext(toRequest(req));
        if (!context) throw new UnauthorizedError();
        user = context.user;
      }

      let storeId: string | null = null;
      let role: Role | null = null;
      if (store && user) {
        const requested =
          typeof req.query.storeId === "string"
            ? req.query.storeId
            : firstValue(req.headers["x-store-id"] as string | undefined);
        if (requested) {
          const membership = await requireStoreAccess(user.id, requested, minRole);
          storeId = membership.storeId;
          role = membership.role;
        } else {
          const fallback = await getDefaultStoreForUser(user.id);
          if (!fallback) {
            throw new AuthorizationError("No tienes ninguna tienda asignada");
          }
          storeId = fallback.id;
          role = fallback.role;
        }
      }

      const result = await endpoint({
        req,
        res,
        user,
        storeId,
        role,
        body: req.body as unknown,
      });

      if (!res.headersSent && result !== undefined) {
        res.status(200).json(result);
      }
    } catch (error) {
      if (!res.headersSent) sendError(res, error);
    }
  };
}
