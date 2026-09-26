import type { VercelRequest, VercelResponse } from "@vercel/node";
import { route } from "./_lib/router";

/** Handles single-segment API paths: /api/dashboard, /api/sales, /api/stores… */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const a = String(req.query.a ?? "");
  return route([a], req, res);
}
