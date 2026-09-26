import { signupSchema } from "../../src/schemas/auth.js";
import { createSessionCookie } from "../../server/auth/middleware.js";
import { createSession } from "../../server/auth/session.js";
import { createUser } from "../../server/auth/user.js";
import { createStore } from "../../server/services/stores.js";
import { handler } from "../_lib/handler.js";

export default handler(
  {
    POST: async ({ res, body }) => {
      const input = signupSchema.parse(body);
      const user = await createUser({
        name: input.name,
        email: input.email,
        password: input.password,
      });
      const store = await createStore(user.id, { name: "Mi tienda" });
      const { token } = await createSession(user.id);
      res.setHeader("Set-Cookie", createSessionCookie(token));
      return { user, store };
    },
  },
  { auth: false },
);
