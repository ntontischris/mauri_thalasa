import postgres from "postgres";

const sql = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" },
);

async function main() {
  console.log("--- Adding default_station to categories ---");
  await sql`
    ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS default_station text
    CHECK (default_station IN ('hot', 'cold', 'bar', 'dessert'))
  `;
  console.log("Column added.");

  console.log("\n--- Heuristic seed of default_station ---");
  // Bar: drinks
  await sql`
    UPDATE categories
    SET default_station = 'bar'
    WHERE name ~* '(ΚΡΑΣΙ|ΜΠΥΡ|ΟΥΖΟ|ΟΥΖΑ|ΤΣΙΠΟΥΡ|ΠΟΤΟ|ΠΟΤΑ|ΑΝΑΨΥΚΤ|ΣΑΜΠΑΝ|ΧΥΜΟ|ΝΕΡΟ|ΚΑΦΕ|ΤΣΑΪ|ΤΣΑΙ|ΡΟΦΗΜ)'
      AND (default_station IS NULL)
  `;

  // Dessert station: sweets, ice cream, fruit
  await sql`
    UPDATE categories
    SET default_station = 'dessert'
    WHERE name ~* '(ΕΠΙΔΟΡΠ|ΓΛΥΚ|ΠΑΓΩΤ|ΦΡΟΥΤ)'
      AND (default_station IS NULL)
  `;

  // Cold station: salads, cheeses, cold appetizers
  await sql`
    UPDATE categories
    SET default_station = 'cold'
    WHERE name ~* '(ΣΑΛΑΤ|ΤΥΡΙ|ΚΡΥ|ΠΡΟΣΟΥΤ|ΑΛΛΑΝΤ)'
      AND (default_station IS NULL)
  `;

  // Everything else → hot
  await sql`
    UPDATE categories
    SET default_station = 'hot'
    WHERE default_station IS NULL
  `;

  console.log("\n--- Category → station mapping ---");
  const mapping = await sql`
    SELECT name, default_station FROM categories ORDER BY default_station, name
  `;
  console.table(mapping);

  console.log("\n--- Syncing products.station to category.default_station ---");
  const syncResult = await sql`
    UPDATE products p
    SET station = c.default_station::station_type
    FROM categories c
    WHERE p.category_id = c.id
      AND c.default_station IS NOT NULL
      AND p.station::text <> c.default_station
  `;
  console.log(`Updated ${syncResult.count} products.`);

  console.log("\n--- Station breakdown ---");
  const breakdown = await sql`
    SELECT station, COUNT(*) as count FROM products GROUP BY station ORDER BY count DESC
  `;
  console.table(breakdown);

  await sql`NOTIFY pgrst, 'reload schema'`;

  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
