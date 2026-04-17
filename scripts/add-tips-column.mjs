import postgres from "postgres";

const sql = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" },
);

await sql`
  ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS tip_amount numeric(10,2) NOT NULL DEFAULT 0
`;
console.log("orders.tip_amount column ready");

await sql`NOTIFY pgrst, 'reload schema'`;
await sql.end();
