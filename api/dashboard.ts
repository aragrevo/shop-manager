import { periodSchema } from "../src/schemas/common";
import { getDashboard } from "../server/services/dashboard";
import { handler } from "./_lib/handler";

export default handler(
  {
    GET: async ({ req, storeId }) => {
      const period = periodSchema.parse(req.query.period ?? "30d");
      return getDashboard(storeId as string, period);
    },
  },
  { store: true },
);
