import pg from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required");
const retentionDays = Number(process.env.STAGING_RETENTION_DAYS ?? "90");
if (!Number.isInteger(retentionDays) || retentionDays < 1 || retentionDays > 3650)
  throw new Error("STAGING_RETENTION_DAYS must be an integer from 1 to 3650");

const client = new pg.Client({ connectionString });
await client.connect();
try {
  const result = await client.query(
    `DELETE FROM staging_records
     WHERE status IN ('IMPORTED','REJECTED')
       AND updated_at < NOW() - make_interval(days => $1::int)`,
    [retentionDays]
  );
  console.info("staging_retention", { retentionDays, deleted: result.rowCount ?? 0 });
} finally {
  await client.end();
}
