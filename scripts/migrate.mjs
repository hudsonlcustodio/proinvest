import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");

const client = new Client({ connectionString });
await client.connect();

try {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const dir = path.resolve("database/migrations");
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const sql = await fs.readFile(path.join(dir, file), "utf8");
    const checksum = crypto.createHash("sha256").update(sql).digest("hex");

    const existing = await client.query(
      "SELECT checksum FROM schema_migrations WHERE filename = $1",
      [file]
    );

    if (existing.rowCount) {
      if (existing.rows[0].checksum !== checksum) {
        throw new Error(`MIGRATION_DRIFT: ${file}`);
      }
      console.log(`Already applied ${file}`);
      continue;
    }

    console.log(`Applying ${file}`);
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations(filename, checksum) VALUES ($1, $2)",
        [file, checksum]
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }
} finally {
  await client.end();
}
