import { paginationSchema } from "../../src/schemas/common";
import { customerInputSchema } from "../../src/schemas/customer";
import { createCustomer, listCustomers } from "../../server/services/customers";
import { handler } from "../_lib/handler";

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
