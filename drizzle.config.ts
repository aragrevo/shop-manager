import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:local.db";
const authToken = process.env.DATABASE_AUTH_TOKEN;

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./drizzle",
  dialect: authToken ? "turso" : "sqlite",
  dbCredentials: {
    url,
    authToken,
  },
  verbose: true,
  strict: true,
});
