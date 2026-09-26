import { z } from "zod";
import {
  createCategory,
  listCategories,
} from "../../server/services/categories";
import { handler } from "../_lib/handler";

const categoryInput = z.object({
  name: z.string().trim().min(1, "El nombre es obligatorio").max(80),
  type: z.enum(["product", "expense"]),
});

export default handler(
  {
    GET: async ({ req, storeId }) => {
      const type =
        req.query.type === "product" || req.query.type === "expense"
          ? req.query.type
          : undefined;
      return listCategories(storeId as string, type);
    },
    POST: async ({ body, storeId }) => {
      const input = categoryInput.parse(body);
      return createCategory(storeId as string, input);
    },
  },
  { store: true },
);
