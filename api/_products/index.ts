import { paginationSchema } from "../../src/schemas/common.js";
import { productInputSchema } from "../../src/schemas/product.js";
import {
  createProduct,
  getInventoryStats,
  listProducts,
} from "../../server/services/products.js";
import { handler } from "../_lib/handler.js";

export default handler(
  {
    GET: async ({ req, storeId }) => {
      const sid = storeId as string;
      if (req.query.stats === "true") {
        return getInventoryStats(sid);
      }
      const { page, pageSize } = paginationSchema.parse(req.query);
      const filters = {
        categoryId: typeof req.query.categoryId === "string" ? req.query.categoryId : undefined,
        active:
          req.query.active === undefined ? undefined : req.query.active !== "false",
        lowStock: req.query.lowStock === "true",
        search: typeof req.query.search === "string" ? req.query.search : undefined,
        sort: typeof req.query.sort === "string" ? req.query.sort : undefined,
        order: (req.query.order === "asc" ? "asc" : "desc") as "asc" | "desc",
      };
      return listProducts(sid, filters, { page, pageSize });
    },
    POST: async ({ body, storeId }) => {
      const input = productInputSchema.parse(body);
      return createProduct(storeId as string, input);
    },
  },
  { store: true },
);
