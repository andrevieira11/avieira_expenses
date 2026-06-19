import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * postgres-js connects lazily (no connection at import), so a missing DATABASE_URL
 * does not break `next build`; it only errors on the first query at runtime, where
 * the env var is always set. A single client is reused across dev hot reloads.
 */
const connectionString = process.env.DATABASE_URL ?? "";

const globalForDb = globalThis as unknown as {
  _sql?: ReturnType<typeof postgres>;
};

const client =
  globalForDb._sql ?? postgres(connectionString, { max: 10, onnotice: () => {} });

if (process.env.NODE_ENV !== "production") globalForDb._sql = client;

export const db = drizzle(client, { schema });
export { client as pgClient };
export type DB = typeof db;
