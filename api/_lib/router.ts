import type { VercelRequest, VercelResponse } from "@vercel/node";
import loginHandler from "../_auth/login";
import logoutHandler from "../_auth/logout";
import sessionHandler from "../_auth/session";
import signupHandler from "../_auth/signup";
import categoriesIndex from "../_categories/index";
import customersId from "../_customers/[id]";
import customersIndex from "../_customers/index";
import dashboardHandler from "../_dashboard";
import expensesId from "../_expenses/[id]";
import expensesIndex from "../_expenses/index";
import reportsIndex from "../_reports/index";
import salesId from "../_sales/[id]";
import salesIndex from "../_sales/index";
import storesId from "../_stores/[id]";
import storesIndex from "../_stores/index";

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
    case "customers":
      if (second) {
        req.query.id = second;
        handler = customersId;
      } else {
        handler = customersIndex;
      }
      break;
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
