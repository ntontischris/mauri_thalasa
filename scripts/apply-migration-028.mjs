import postgres from "postgres";
import { readFileSync } from "fs";

const sql = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" },
);

const migration = readFileSync(
  "./supabase/migrations/028_floor_plan.sql",
  "utf-8",
);

try {
  await sql.unsafe(migration);
  const floors = await sql`SELECT id, name, sort_order FROM floors ORDER BY sort_order`;
  const zones = await sql`SELECT COUNT(*) AS total, COUNT(floor_id) AS with_floor FROM zones`;
  const tables = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'tables' AND column_name IN ('width','height','is_active','label')
    ORDER BY column_name
  `;
  console.log("Migration 028 applied.");
  console.log("  Floors:", floors);
  console.log("  Zones:", zones[0]);
  console.log("  Tables new cols:", tables.map((r) => r.column_name));
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
