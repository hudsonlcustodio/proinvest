import pg from "pg";

const source = process.env.DATABASE_URL;
if (!source) throw new Error("DATABASE_URL is required");
const adminUrl = new URL(source);
adminUrl.pathname = "/postgres";
const client = new pg.Client({ connectionString: adminUrl.toString() });
await client.connect();
try {
  await client.query("CREATE DATABASE proinvest_browser");
  console.info("browser_test_database_created");
} finally {
  await client.end();
}
