import postgres from "postgres";
import { readFileSync } from "fs";

const sql = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" },
);

const migration = readFileSync(
  "./supabase/migrations/027_recipes_overhaul.sql",
  "utf-8",
);

try {
  await sql.unsafe(migration);
  const r = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'recipes' ORDER BY ordinal_position
  `;
  console.log("Migration 027 applied. recipes columns:", r.map((x) => x.column_name));
} catch (err) {
  console.error("Migration failed:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
