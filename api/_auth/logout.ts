import {
  createBlankSessionCookie,
  getSessionToken,
} from "../../server/auth/middleware.js";
import { invalidateSession } from "../../server/auth/session.js";
import { handler, toRequest } from "../_lib/handler.js";

export default handler(
  {
    POST: async ({ req, res }) => {
      const token = getSessionToken(toRequest(req));
      if (token) await invalidateSession(token);
      res.setHeader("Set-Cookie", createBlankSessionCookie());
      return { ok: true };
    },
  },
  { auth: false },
);
