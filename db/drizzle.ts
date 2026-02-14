import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { config } from "dotenv";
import * as schema from "./schema";

config({ path: ".env" });

import "dotenv/config";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

const pool = new Pool({
  connectionString: databaseUrl,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle({
  client: pool,
  schema: schema,
});
