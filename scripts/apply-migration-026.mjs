import postgres from "postgres";
import { readFileSync } from "fs";

const sql = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" },
);

const migration = readFileSync(
  "./supabase/migrations/026_loyalty_overhaul.sql",
  "utf-8",
);

try {
  await sql.unsafe(migration);
  console.log("Migration 026 applied successfully");
  const counts = await sql`
    SELECT
      (SELECT COUNT(*) FROM loyalty_tiers) AS tiers,
      (SELECT COUNT(*) FROM loyalty_rewards) AS rewards,
      (SELECT COUNT(*) FROM loyalty_transactions) AS txns
  `;
  console.log("Counts:", counts[0]);
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
