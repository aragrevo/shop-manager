import { existsSync } from "node:fs";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { loadEnv, type Plugin, type ViteDevServer } from "vite";
import type { VercelRequest, VercelResponse } from "@vercel/node";

type Next = (err?: unknown) => void;

function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve(undefined);
      try {
        resolve(JSON.parse(raw));
      } catch {
        resolve(undefined);
      }
    });
    req.on("error", () => resolve(undefined));
  });
}

async function runApi(
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  // Same single catch-all function Vercel deploys, for dev/prod parity.
  const file = join(server.config.root, "api", "[...path].ts");
  if (!existsSync(file)) return false;

  const url = new URL(req.url ?? "/", "http://localhost");
  const segments = url.pathname
    .replace(/^\/api\/?/, "")
    .replace(/\/$/, "")
    .split("/")
    .filter(Boolean);

  const query: Record<string, string | string[]> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  query.path = segments;

  const body = await readBody(req);

  const vreq = req as IncomingMessage & {
    query: Record<string, string | string[]>;
    body: unknown;
  };
  vreq.query = query;
  vreq.body = body;

  const vres = res as ServerResponse & {
    status: (code: number) => typeof vres;
    json: (data: unknown) => typeof vres;
    send: (data: unknown) => typeof vres;
  };
  vres.status = (code: number) => {
    vres.statusCode = code;
    return vres;
  };
  vres.json = (data: unknown) => {
    if (!vres.getHeader("Content-Type")) {
      vres.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    vres.end(JSON.stringify(data));
    return vres;
  };
  vres.send = (data: unknown) => {
    vres.end(typeof data === "string" ? data : JSON.stringify(data));
    return vres;
  };

  const mod = (await server.ssrLoadModule(file)) as {
    default?: (req: VercelRequest, res: VercelResponse) => Promise<void> | void;
  };
  if (!mod.default) return false;

  await mod.default(vreq as unknown as VercelRequest, vres as unknown as VercelResponse);
  return true;
}

/**
 * Dev-only: serves the `api/[...path].ts` serverless handler under /api during
 * `pnpm dev`, so the app is fully functional locally without the Vercel CLI.
 * In production Vercel runs the same function natively; this plugin is dev-only.
 */
export function apiDevPlugin(): Plugin {
  return {
    name: "shop-manager-api-dev",
    apply: "serve",
    config(_config, { mode }) {
      const env = loadEnv(mode, process.cwd(), "");
      for (const [key, value] of Object.entries(env)) {
        if (process.env[key] === undefined) process.env[key] = value;
      }
    },
    configureServer(server) {
      server.middlewares.use((req: IncomingMessage, res: ServerResponse, next: Next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();
        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }
        runApi(server, req, res)
          .then((handled) => {
            if (!handled) next();
          })
          .catch((error: unknown) => {
            console.error("[api-dev]", error);
            if (!res.headersSent) {
              res.statusCode = 500;
              res.setHeader("Content-Type", "application/json; charset=utf-8");
              res.end(JSON.stringify({ error: "Error interno del servidor", code: "internal" }));
            }
          });
      });
    },
  };
}
