import { periodSchema } from "../src/schemas/common.js";
import { getDashboard } from "../server/services/dashboard.js";
import { handler } from "./_lib/handler.js";

export default handler(
  {
    GET: async ({ req, storeId }) => {
      const period = periodSchema.parse(req.query.period ?? "30d");
      return getDashboard(storeId as string, period);
    },
  },
  { store: true },
);
