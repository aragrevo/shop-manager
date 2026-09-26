import { paginationSchema } from "../../src/schemas/common";
import { expenseFilterSchema, expenseInputSchema } from "../../src/schemas/expense";
import { createExpense, listExpenses } from "../../server/services/expenses";
import { handler } from "../_lib/handler";

export default handler(
  {
    GET: async ({ req, storeId }) => {
      const { page, pageSize } = paginationSchema.parse(req.query);
      const filters = expenseFilterSchema.parse({
        status: req.query.status,
        categoryId: req.query.categoryId,
        from: req.query.from,
        to: req.query.to,
      });
      const listFilters = {
        ...filters,
        search: typeof req.query.search === "string" ? req.query.search : undefined,
        sort: typeof req.query.sort === "string" ? req.query.sort : undefined,
        order: (req.query.order === "asc" ? "asc" : "desc") as "asc" | "desc",
      };
      return listExpenses(storeId as string, listFilters, { page, pageSize });
    },
    POST: async ({ body, storeId }) => {
      const input = expenseInputSchema.parse(body);
      return createExpense(storeId as string, input);
    },
  },
  { store: true },
);
