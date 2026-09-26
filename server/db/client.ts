import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type Database = LibSQLDatabase<typeof schema>;
export type LibsqlClient = ReturnType<typeof createClient>;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

let client: LibsqlClient | undefined;
let db: Database | undefined;

/**
 * Single shared libSQL client. Never instantiate libSQL clients elsewhere.
 */
export function getClient(): LibsqlClient {
  if (!client) {
    client = createClient({
      url: requiredEnv("DATABASE_URL"),
      authToken: process.env.DATABASE_AUTH_TOKEN,
    });
  }
  return client;
}

/**
 * Single shared Drizzle instance. All DB access goes through here.
 */
export function getDb(): Database {
  if (!db) {
    db = drizzle(getClient(), { schema });
  }
  return db;
}

export { schema };
