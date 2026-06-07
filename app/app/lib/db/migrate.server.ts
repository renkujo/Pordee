import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./client";

const migrationsFolder = "./app/lib/db/migrations";

let migrationPromise: Promise<void> | null = null;

export const ensureFinanceDatabase = () => {
  migrationPromise ??= migrate(db, { migrationsFolder });
  return migrationPromise;
};
