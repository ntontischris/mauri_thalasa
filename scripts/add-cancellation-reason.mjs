import postgres from "postgres";

const sql = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" },
);

await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason text`;
await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancelled_at timestamptz`;
console.log("orders.cancellation_reason + cancelled_at ready");

await sql`NOTIFY pgrst, 'reload schema'`;
await sql.end();
