import { readFileSync } from "fs";
import postgres from "postgres";

const sql = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" },
);

const EXPORTS = "C:/Users/ntont/Desktop/MAURI/exports";

function readPiped(filename, fieldCount) {
  const content = readFileSync(`${EXPORTS}/${filename}`, "utf-8");
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("(") && !line.startsWith("Msg "))
    .map((line) => line.split("|").map((f) => f.trim()))
    .filter((fields) => fields.length >= fieldCount);
}

async function migrateCategories() {
  console.log("\n=== CATEGORIES ===");
  const rows = readPiped("categories.utf8.txt", 3);
  console.log(`  Parsed ${rows.length} categories`);

  // Clear existing and re-insert (to maintain legacy_id mapping)
  await sql`DELETE FROM products`; // FK dependency
  await sql`DELETE FROM categories`;

  const data = rows.map((r, i) => ({
    name: r[2],
    sort_order: i + 1,
    legacy_id: parseInt(r[0]),
    source: "softone",
    metadata: { softone_code: r[1] },
  }));

  const result = await sql`INSERT INTO categories ${sql(data)} RETURNING id, legacy_id`;
  console.log(`  Inserted ${result.length} categories`);

  // Return mapping: legacy_id → uuid
  const map = {};
  result.forEach((r) => (map[r.legacy_id] = r.id));
  return map;
}

async function migrateFpaTypes() {
  console.log("\n=== FPA TYPES (VAT) ===");
  const rows = readPiped("fpa_types.utf8.txt", 3);
  // Map: softone FPA ID → percentage
  const map = {};
  for (const r of rows) {
    const id = parseInt(r[0]);
    const pct = parseFloat(r[2]) * 100; // Convert 0.24 → 24
    map[id] = Math.round(pct);
    console.log(`  FPA ${id}: ${r[1]} = ${Math.round(pct)}%`);
  }
  return map;
}

async function migrateProducts(categoryMap, fpaMap) {
  console.log("\n=== PRODUCTS ===");
  // Fields: ID, Code, Ono, PrLianFPA, FPAClassID, ProductCat1ID, BuyPrice, CostPrice, IsActive
  const rows = readPiped("products.utf8.txt", 9);
  console.log(`  Parsed ${rows.length} products`);

  const data = rows.map((r) => {
    const fpaId = parseInt(r[4]);
    const catLegacyId = parseInt(r[5]);
    const vatRate = fpaMap[fpaId] ?? 24;

    return {
      code: r[1],
      name: r[2],
      price: parseFloat(r[3]) || 0,
      vat_rate: vatRate,
      category_id: categoryMap[catLegacyId] || null,
      cost_price: parseFloat(r[7]) || null,
      available: r[8] === "1",
      station: "hot", // Default, can be changed later
      sort_order: 0,
      legacy_id: parseInt(r[0]),
      source: "softone",
      metadata: {},
    };
  });

  // Insert in batches
  const BATCH = 200;
  let inserted = 0;
  for (let i = 0; i < data.length; i += BATCH) {
    const batch = data.slice(i, i + BATCH);
    try {
      await sql`INSERT INTO products ${sql(batch)}`;
      inserted += batch.length;
    } catch (e) {
      // One by one fallback
      for (const rec of batch) {
        try {
          await sql`INSERT INTO products ${sql(rec)}`;
          inserted++;
        } catch (e2) {
          console.error(`  Skipped product "${rec.name}": ${e2.message}`);
        }
      }
    }
  }
  console.log(`  Inserted ${inserted} products`);
}

async function migrateSuppliers() {
  console.log("\n=== SUPPLIERS ===");
  // Fields: ID, Code, Ono, AFM, Tel_2, Tel2_2, Mobil_2, EMail, Address, Area, Town, TK
  const rows = readPiped("suppliers.utf8.txt", 3);
  console.log(`  Parsed ${rows.length} suppliers`);

  await sql`DELETE FROM supplier_order_items`;
  await sql`DELETE FROM supplier_orders`;
  await sql`DELETE FROM ingredients WHERE supplier_id IS NOT NULL`;
  await sql`DELETE FROM suppliers`;

  const data = rows.map((r) => ({
    name: (r[2] || "").trim(),
    phone: r[4] || r[6] || null, // Tel_2 or Mobil_2
    email: r[7] || null,
    afm: r[3] || null,
    address: {
      street: r[8] || undefined,
      area: r[9] || undefined,
      city: r[10] || undefined,
      zip: r[11] || undefined,
    },
    categories: [],
    legacy_id: parseInt(r[0]),
    source: "softone",
    metadata: { softone_code: r[1] },
  })).filter((d) => d.name);

  if (data.length > 0) {
    const result = await sql`INSERT INTO suppliers ${sql(data)} RETURNING id, legacy_id`;
    console.log(`  Inserted ${result.length} suppliers`);
  }
}

async function migrateZonesAndTables() {
  console.log("\n=== ZONES ===");
  const areaRows = readPiped("food_areas.utf8.txt", 2);
  console.log(`  Parsed ${areaRows.length} zones`);

  // Clear existing
  await sql`UPDATE orders SET table_id = NULL`;
  await sql`DELETE FROM tables`;
  await sql`DELETE FROM zones`;

  const colors = ["#3b82f6", "#22c55e", "#f59e0b", "#a855f7", "#ef4444"];
  const zoneData = areaRows.map((r, i) => ({
    name: r[1],
    color: colors[i % colors.length],
    sort_order: i + 1,
    legacy_id: parseInt(r[0]),
    metadata: {},
  }));

  const zones = await sql`INSERT INTO zones ${sql(zoneData)} RETURNING id, legacy_id`;
  console.log(`  Inserted ${zones.length} zones`);

  const zoneMap = {};
  zones.forEach((z) => (zoneMap[z.legacy_id] = z.id));

  console.log("\n=== TABLES ===");
  // Fields: ID, Ono, AreaID, TableSize, Code
  const tableRows = readPiped("food_tables.utf8.txt", 4);
  console.log(`  Parsed ${tableRows.length} tables`);

  const tableData = tableRows.map((r, i) => {
    const areaId = parseInt(r[2]);
    // Parse TableSize like "108/83" → width/height (use for position)
    const size = (r[3] || "100/100").split("/");

    return {
      number: parseInt(r[4] || r[1]) || (i + 1),
      capacity: 4, // Default, adjustable later
      status: "available",
      zone_id: zoneMap[areaId] || zones[0]?.id,
      x: ((i % 10) * 10) + 5,
      y: (Math.floor(i / 10) * 15) + 5,
      shape: "square",
      rotation: 0,
      legacy_id: parseInt(r[0]),
      metadata: { softone_size: r[3] },
    };
  });

  if (tableData.length > 0) {
    const tables = await sql`INSERT INTO tables ${sql(tableData)} RETURNING id`;
    console.log(`  Inserted ${tables.length} tables`);
  }
}

async function migrateSalesmen() {
  console.log("\n=== STAFF (SalesMen) ===");
  // Fields: ID, Code, Ono, IsActive
  const rows = readPiped("salesmen.utf8.txt", 4);
  console.log(`  Parsed ${rows.length} salesmen`);

  // Don't delete existing - just add missing ones
  const existing = await sql`SELECT legacy_id FROM staff_members WHERE legacy_id IS NOT NULL`;
  const existingIds = new Set(existing.map((e) => e.legacy_id));

  const newStaff = rows
    .filter((r) => !existingIds.has(parseInt(r[0])))
    .map((r, i) => ({
      name: r[2],
      role: "waiter",
      pin: String(5000 + parseInt(r[0])).padStart(4, "0"), // Auto-generate PINs
      is_active: r[3] === "1",
      legacy_id: parseInt(r[0]),
      source: "softone",
      metadata: { softone_code: r[1] },
    }));

  if (newStaff.length > 0) {
    const result = await sql`INSERT INTO staff_members ${sql(newStaff)} RETURNING id, name`;
    console.log(`  Inserted ${result.length} new staff members`);
    result.forEach((s) => console.log(`    ${s.name} (PIN auto-generated)`));
  } else {
    console.log(`  All salesmen already exist`);
  }
}

async function main() {
  console.log("========================================");
  console.log("  SoftOne → EatFlow Migration");
  console.log("========================================");

  // 1. FPA types (VAT mapping)
  const fpaMap = await migrateFpaTypes();

  // 2. Categories (needed for products FK)
  const categoryMap = await migrateCategories();

  // 3. Products
  await migrateProducts(categoryMap, fpaMap);

  // 4. Suppliers
  await migrateSuppliers();

  // 5. Zones + Tables
  await migrateZonesAndTables();

  // 6. Staff
  await migrateSalesmen();

  // Final counts
  console.log("\n========================================");
  console.log("  FINAL COUNTS");
  console.log("========================================");
  const counts = await sql`
    SELECT 'categories' as tbl, COUNT(*) as c FROM categories UNION ALL
    SELECT 'products', COUNT(*) FROM products UNION ALL
    SELECT 'suppliers', COUNT(*) FROM suppliers UNION ALL
    SELECT 'zones', COUNT(*) FROM zones UNION ALL
    SELECT 'tables', COUNT(*) FROM tables UNION ALL
    SELECT 'staff_members', COUNT(*) FROM staff_members UNION ALL
    SELECT 'customers', COUNT(*) FROM customers
  `;
  counts.forEach((r) => console.log(`  ${r.tbl}: ${r.c}`));

  await sql.end();
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
