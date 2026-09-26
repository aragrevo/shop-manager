import { paginationSchema } from "../../src/schemas/common.js";
import { saleFilterSchema, saleInputSchema } from "../../src/schemas/sale.js";
import { createSale, listSales } from "../../server/services/sales.js";
import { handler } from "../_lib/handler.js";

export default handler(
  {
    GET: async ({ req, storeId }) => {
      const { page, pageSize } = paginationSchema.parse(req.query);
      const filters = saleFilterSchema.parse({
        status: req.query.status,
        customerId: req.query.customerId,
        from: req.query.from,
        to: req.query.to,
      });
      return listSales(storeId as string, filters, { page, pageSize });
    },
    POST: async ({ body, storeId }) => {
      const input = saleInputSchema.parse(body);
      return createSale(storeId as string, input);
    },
  },
  { store: true },
);
