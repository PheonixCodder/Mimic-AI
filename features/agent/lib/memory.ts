import { PostgresSaver } from "@langchain/langgraph-checkpoint-postgres";
import pg from "pg";

/**
 * Creates a PostgresSaver instance using the DATABASE_URL environment variable.
 */
export function createPostgresMemory(): PostgresSaver {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is missing");
  }
  
  // Use pg Pool inside PostgresSaver to reuse database connections efficiently
  const pool = new pg.Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
  });

  return new PostgresSaver(pool);
}

// Single instance of the Postgres saver checkpointer
export const postgresCheckpointer = createPostgresMemory();
