import { cancelSale, getSale } from "../../server/services/sales.js";
import { handler } from "../_lib/handler.js";

export default handler(
  {
    GET: async ({ req, storeId }) => {
      const id = String(req.query.id);
      return getSale(storeId as string, id);
    },
    PATCH: async ({ req, storeId }) => {
      const id = String(req.query.id);
      await cancelSale(storeId as string, id);
      return { ok: true };
    },
  },
  { store: true },
);
