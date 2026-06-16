/**
 * Migration runner — executes a SQL migration file against InsForge Postgres.
 * Usage: bun run scripts/run-migration.ts migrations/20260623100000_video-clips.sql
 */
import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { createAdminClient } from "@insforge/sdk";

dotenv.config({ path: ".env.local" });

const file = process.argv[2];
if (!file) {
  console.error("Usage: bun run scripts/run-migration.ts <path-to-sql-file>");
  process.exit(1);
}

const sql = await fs.readFile(path.resolve(file), "utf-8");

const db = createAdminClient({
  baseUrl: process.env.NEXT_PUBLIC_INSFORGE_URL!,
  apiKey: process.env.INSFORGE_API_KEY!,
});

console.log(`Running migration: ${file}`);
const { error } = await db.database.rpc("exec_sql" as never, { sql } as never);
if (error) {
  // InsForge may not expose exec_sql — fall back to raw REST endpoint
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_INSFORGE_URL}/rest/v1/rpc/exec_sql`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": process.env.INSFORGE_API_KEY!,
        "Authorization": `Bearer ${process.env.INSFORGE_API_KEY!}`,
      },
      body: JSON.stringify({ sql }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    console.error("Migration failed:", body);
    process.exit(1);
  }
  console.log("Migration applied via REST endpoint.");
} else {
  console.log("Migration applied successfully.");
}
