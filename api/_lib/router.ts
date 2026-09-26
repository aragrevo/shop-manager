import type { VercelRequest, VercelResponse } from "@vercel/node";
import loginHandler from "../_auth/login.js";
import logoutHandler from "../_auth/logout.js";
import sessionHandler from "../_auth/session.js";
import signupHandler from "../_auth/signup.js";
import categoriesIndex from "../_categories/index.js";
// Clientes deshabilitado por ahora (no se usa).
// import customersId from "../_customers/[id].js";
// import customersIndex from "../_customers/index.js";
import dashboardHandler from "../_dashboard.js";
import expensesId from "../_expenses/[id].js";
import expensesIndex from "../_expenses/index.js";
import reportsIndex from "../_reports/index.js";
import salesId from "../_sales/[id].js";
import salesIndex from "../_sales/index.js";
import storesId from "../_stores/[id].js";
import storesIndex from "../_stores/index.js";

type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

const authActions: Record<string, Handler> = {
  login: loginHandler,
  logout: logoutHandler,
  session: sessionHandler,
  signup: signupHandler,
};

/**
 * Shared dispatcher for the API. Called by the thin dynamic-segment entry
 * files (`api/[a].ts`, `api/[a]/[b].ts`). Serverless functions here cannot use
 * Next.js-style catch-all routes, so paths are split into at most two dynamic
 * segments and routed here.
 */
export async function route(
  segments: string[],
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const resource = segments[0];
  const second = segments[1];

  let handler: Handler | undefined;

  switch (resource) {
    case "auth":
      handler = second ? authActions[second] : undefined;
      break;
    case "dashboard":
      handler = dashboardHandler;
      break;
    case "reports":
      handler = reportsIndex;
      break;
    case "categories":
      handler = categoriesIndex;
      break;
    case "stores":
      if (second) {
        req.query.id = second;
        handler = storesId;
      } else {
        handler = storesIndex;
      }
      break;
    case "sales":
      if (second) {
        req.query.id = second;
        handler = salesId;
      } else {
        handler = salesIndex;
      }
      break;
    case "expenses":
      if (second) {
        req.query.id = second;
        handler = expensesId;
      } else {
        handler = expensesIndex;
      }
      break;
    // Clientes deshabilitado por ahora (no se usa).
    // case "customers":
    //   if (second) {
    //     req.query.id = second;
    //     handler = customersId;
    //   } else {
    //     handler = customersIndex;
    //   }
    //   break;
    // Productos deshabilitado por ahora (no se usa).
    // case "products":
    //   if (second) {
    //     req.query.id = second;
    //     handler = productsId;
    //   } else {
    //     handler = productsIndex;
    //   }
    //   break;
    default:
      handler = undefined;
  }

  if (!handler) {
    res.status(404).json({ error: "Ruta no encontrada", code: "not_found" });
    return;
  }

  await handler(req, res);
}
