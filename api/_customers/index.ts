import { paginationSchema } from "../../src/schemas/common.js";
import { customerInputSchema } from "../../src/schemas/customer.js";
import { createCustomer, listCustomers } from "../../server/services/customers.js";
import { handler } from "../_lib/handler.js";

export default handler(
  {
    GET: async ({ req, storeId }) => {
      const { page, pageSize } = paginationSchema.parse(req.query);
      const search = typeof req.query.search === "string" ? req.query.search : undefined;
      return listCustomers(storeId as string, { page, pageSize, search });
    },
    POST: async ({ body, storeId }) => {
      const input = customerInputSchema.parse(body);
      return createCustomer(storeId as string, input);
    },
  },
  { store: true },
);
