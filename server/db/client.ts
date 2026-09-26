import { createClient, type Client } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";
import * as schema from "./schema";

export type Database = LibSQLDatabase<typeof schema>;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

let client: Client | undefined;
let db: Database | undefined;

/**
 * Single shared libSQL client. Never instantiate libSQL clients elsewhere.
 */
export function getClient(): Client {
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
