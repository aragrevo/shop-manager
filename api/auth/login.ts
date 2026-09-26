import { loginSchema } from "../../src/schemas/auth";
import {
  createBlankSessionCookie,
  createSessionCookie,
} from "../../server/auth/middleware";
import { createSession } from "../../server/auth/session";
import { verifyUserCredentials } from "../../server/auth/user";
import { handler } from "../_lib/handler";

export default handler(
  {
    POST: async ({ res, body }) => {
      const input = loginSchema.parse(body);
      const user = await verifyUserCredentials(input.email, input.password);
      if (!user) {
        res.setHeader("Set-Cookie", createBlankSessionCookie());
        res.status(401).json({ error: "Credenciales no válidas", code: "invalid_credentials" });
        return;
      }
      const { token } = await createSession(user.id);
      res.setHeader("Set-Cookie", createSessionCookie(token));
      return { user };
    },
  },
  { auth: false },
);
