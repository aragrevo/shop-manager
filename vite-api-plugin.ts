import { existsSync, readdirSync } from "node:fs";
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

function resolveApiFile(root: string, apiPath: string, query: Record<string, string>) {
  const segments = apiPath.split("/").filter(Boolean);
  if (segments.length === 0) return null;

  const direct = [
    join(root, "api", `${apiPath}.ts`),
    join(root, "api", apiPath, "index.ts"),
  ];
  const directFile = direct.find((candidate) => existsSync(candidate));
  if (directFile) return directFile;

  // dynamic route: api/<parent>/[param].ts
  const value = segments[segments.length - 1];
  const parent = segments.slice(0, -1).join("/");
  const parentDir = join(root, "api", parent);
  if (!value || !existsSync(parentDir)) return null;

  const dynamic = readdirSync(parentDir).find((name) => /^\[.+\]\.ts$/.test(name));
  if (!dynamic) return null;
  const param = dynamic.slice(1, -4); // strip [ ] .ts
  query[param] = value;
  return join(parentDir, dynamic);
}

async function runApi(
  server: ViteDevServer,
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const root = server.config.root;
  const url = new URL(req.url ?? "/", "http://localhost");
  const apiPath = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");

  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  const file = resolveApiFile(root, apiPath, query);
  if (!file) return false;

  const body = await readBody(req);

  const vreq = req as IncomingMessage & { query: Record<string, string>; body: unknown };
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
 * Dev-only: serves the `api/` serverless handlers under /api during `pnpm dev`,
 * so the app is fully functional locally without the Vercel CLI.
 * In production Vercel runs `api/` natively; this plugin is dev-only.
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
