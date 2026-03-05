import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!env.DATABASE_URL) return null;
  if (dbInstance) return dbInstance;

  try {
    const queryClient = postgres(env.DATABASE_URL, { prepare: false });
    dbInstance = drizzle(queryClient, { schema });
    return dbInstance;
  } catch {
    return null;
  }
}
