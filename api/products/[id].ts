import { productInputSchema } from "../../src/schemas/product";
import {
  deactivateProduct,
  getProduct,
  updateProduct,
} from "../../server/services/products";
import { handler } from "../_lib/handler";

export default handler(
  {
    GET: async ({ req, storeId }) => {
      const id = String(req.query.id);
      return getProduct(storeId as string, id);
    },
    PATCH: async ({ req, body, storeId }) => {
      const id = String(req.query.id);
      const input = productInputSchema.parse(body);
      return updateProduct(storeId as string, id, input);
    },
    DELETE: async ({ req, storeId }) => {
      const id = String(req.query.id);
      await deactivateProduct(storeId as string, id);
      return { ok: true };
    },
  },
  { store: true },
);
