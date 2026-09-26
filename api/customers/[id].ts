import { customerInputSchema } from "../../src/schemas/customer";
import {
  deleteCustomer,
  getCustomer,
  getCustomerHistory,
  updateCustomer,
} from "../../server/services/customers";
import { handler } from "../_lib/handler";

export default handler(
  {
    GET: async ({ req, storeId }) => {
      const id = String(req.query.id);
      const sid = storeId as string;
      const [customer, history] = await Promise.all([
        getCustomer(sid, id),
        getCustomerHistory(sid, id),
      ]);
      return { customer, history };
    },
    PATCH: async ({ req, body, storeId }) => {
      const id = String(req.query.id);
      const input = customerInputSchema.parse(body);
      return updateCustomer(storeId as string, id, input);
    },
    DELETE: async ({ req, storeId }) => {
      const id = String(req.query.id);
      await deleteCustomer(storeId as string, id);
      return { ok: true };
    },
  },
  { store: true },
);
