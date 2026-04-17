import postgres from "postgres";
import { readFileSync } from "fs";

const sql = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" },
);

const migration = readFileSync(
  "./supabase/migrations/025_customer_crm_additions.sql",
  "utf-8",
);

await sql.unsafe(migration);
console.log("Migration 025 applied");
await sql.end();
