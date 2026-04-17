import postgres from "postgres";

const sql = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" },
);

const r = await sql`
  UPDATE order_items oi
  SET station = p.station
  FROM products p, orders o
  WHERE oi.product_id = p.id
    AND oi.order_id = o.id
    AND o.status = 'active'
    AND oi.station <> p.station
`;

console.log("Synced active order items to current product stations:", r.count);

await sql`NOTIFY pgrst, 'reload schema'`;
await sql.end();
