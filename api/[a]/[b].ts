import type { VercelRequest, VercelResponse } from "@vercel/node";
import { route } from "../_lib/router.js";

/**
 * Handles two-segment API paths: /api/auth/login, /api/sales/:id,
 * /api/stores/:id, etc.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  const a = String(req.query.a ?? "");
  const b = String(req.query.b ?? "");
  return route([a, b], req, res);
}
