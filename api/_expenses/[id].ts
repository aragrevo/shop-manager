import { expenseInputSchema } from "../../src/schemas/expense.js";
import {
  cancelExpense,
  deleteExpense,
  getExpense,
  updateExpense,
} from "../../server/services/expenses.js";
import { handler } from "../_lib/handler.js";

export default handler(
  {
    GET: async ({ req, storeId }) => {
      const id = String(req.query.id);
      return getExpense(storeId as string, id);
    },
    PATCH: async ({ req, body, storeId }) => {
      const id = String(req.query.id);
      const input = expenseInputSchema.parse(body);
      return updateExpense(storeId as string, id, input);
    },
    DELETE: async ({ req, storeId }) => {
      const id = String(req.query.id);
      const action = req.query.action;
      if (action === "cancel") {
        await cancelExpense(storeId as string, id);
      } else {
        await deleteExpense(storeId as string, id);
      }
      return { ok: true };
    },
  },
  { store: true },
);
