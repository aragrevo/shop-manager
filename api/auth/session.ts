import { getRequestContext } from "../../server/auth/middleware";
import { handler, toRequest } from "../_lib/handler";

export default handler(
  {
    GET: async ({ req, res }) => {
      const context = await getRequestContext(toRequest(req));
      if (!context) {
        res.status(401).json({ user: null });
        return;
      }
      return { user: context.user };
    },
  },
  { auth: false },
);
