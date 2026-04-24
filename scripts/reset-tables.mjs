import postgres from "postgres";

const sql = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" },
);

try {
  const before = await sql`SELECT COUNT(*)::int AS n FROM tables WHERE is_active = true`;
  const withOrders = await sql`
    SELECT COUNT(*)::int AS n FROM tables
    WHERE current_order_id IS NOT NULL AND is_active = true
  `;

  console.log(`Active tables: ${before[0].n} (of which ${withOrders[0].n} have open orders)`);

  if (withOrders[0].n > 0) {
    console.log("Cancelling open orders first...");
    await sql`
      UPDATE orders SET status = 'cancelled'
      WHERE status = 'active'
        AND table_id IN (SELECT id FROM tables WHERE is_active = true)
    `;
    await sql`
      UPDATE tables SET current_order_id = NULL, status = 'available'
      WHERE is_active = true
    `;
  }

  // Soft delete (preserves order history via FK)
  const { count } = await sql`UPDATE tables SET is_active = false WHERE is_active = true`;
  console.log(`Soft-deleted ${count} tables.`);

  const after = await sql`SELECT COUNT(*)::int AS n FROM tables WHERE is_active = true`;
  console.log(`Remaining active tables: ${after[0].n}`);
} catch (err) {
  console.error("Reset failed:", err.message);
  process.exit(1);
} finally {
  await sql.end();
}
