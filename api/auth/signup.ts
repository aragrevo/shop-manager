import { signupSchema } from "../../src/schemas/auth";
import { createSessionCookie } from "../../server/auth/middleware";
import { createSession } from "../../server/auth/session";
import { createUser } from "../../server/auth/user";
import { createStore } from "../../server/services/stores";
import { handler } from "../_lib/handler";

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
