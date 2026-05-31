import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

declare global {
  var __pordeePool: Pool | undefined;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Postgres is required in Phase 1.");
  }
  return url;
}

// Reuse one pool across HMR reloads / module re-evaluations.
const pool: Pool = (globalThis.__pordeePool ??= new Pool({
  connectionString: getDatabaseUrl(),
}));

export const db = drizzle(pool, { schema });
export { pool };
