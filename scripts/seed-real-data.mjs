import postgres from "postgres";

const sql = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" }
);

async function seedRealData() {
  // Categories from SoftOne ProductCategory1
  console.log("Inserting categories...");
  const categories = [
    { name: "Ορεκτικά", sort_order: 1, source: "softone" },
    { name: "Σαλάτες", sort_order: 2, source: "softone" },
    { name: "Τηγανητά", sort_order: 3, source: "softone" },
    { name: "Τυριά", sort_order: 4, source: "softone" },
    { name: "Ψάρια Μερίδα", sort_order: 5, source: "softone" },
    { name: "Λευκό Κρασί", sort_order: 6, source: "softone" },
    { name: "Κόκκινο Κρασί", sort_order: 7, source: "softone" },
    { name: "Ποτά", sort_order: 8, source: "softone" },
    { name: "Ούζα", sort_order: 9, source: "softone" },
    { name: "Τσίπουρα", sort_order: 10, source: "softone" },
    { name: "Ρετσίνες Μπύρες", sort_order: 11, source: "softone" },
    { name: "Αναψυκτικά", sort_order: 12, source: "softone" },
    { name: "Ψάρια Κιλό", sort_order: 13, source: "softone" },
    { name: "Γλυκά", sort_order: 14, source: "softone" },
    { name: "Γλυκά Κερασμένα", sort_order: 15, source: "softone" },
  ];

  const catResults = await sql`INSERT INTO categories ${sql(categories)} RETURNING id, name`;
  console.log("  Inserted", catResults.length, "categories");

  const catMap = {};
  catResults.forEach((c) => (catMap[c.name] = c.id));

  // Zones from SoftOne FoodAreas
  console.log("Inserting zones...");
  const zones = await sql`
    INSERT INTO zones (name, color, sort_order)
    VALUES
      ('Κεντρική', '#3b82f6', 1),
      ('Πάνω', '#22c55e', 2),
      ('Κάτω', '#f59e0b', 3)
    RETURNING id, name
  `;
  console.log("  Inserted", zones.length, "zones");

  // Staff from SoftOne Users
  console.log("Inserting staff...");
  const staff = await sql`
    INSERT INTO staff_members (name, role, pin, is_active, source)
    VALUES
      ('Administrator', 'manager', '0000', true, 'softone'),
      ('ΜΑΡΚΑ 1', 'waiter', '1111', true, 'softone'),
      ('ΜΑΡΚΑ 2', 'waiter', '2222', true, 'softone'),
      ('ΣΕΡΒΙΤΟΡΟΣ', 'waiter', '3333', true, 'softone')
    RETURNING id, name
  `;
  console.log("  Inserted", staff.length, "staff members");

  // Top products from SoftOne
  console.log("Inserting products...");
  const products = [
    { code: "1", name: "ΨΩΜΙ ΚΑΤ ΑΤΟΜΟ", price: 4.0, category_id: catMap["Ορεκτικά"], vat_rate: 13, station: "hot", sort_order: 1, source: "softone" },
    { code: "2", name: "ΤΑΡΑΜΑΣ ΑΣΠΡΟΣ", price: 9.5, category_id: catMap["Ορεκτικά"], vat_rate: 13, station: "cold", sort_order: 2, source: "softone" },
    { code: "3", name: "ΑΝΤΖΟΥΓΙΕΣ ΙΣΠΑΝΙΑΣ", price: 14.0, category_id: catMap["Ορεκτικά"], vat_rate: 13, station: "cold", sort_order: 3, source: "softone" },
    { code: "4", name: "ΛΑΚΕΡΔΑ ΠΟΛΙΤΙΚΗ", price: 16.0, category_id: catMap["Ορεκτικά"], vat_rate: 13, station: "cold", sort_order: 4, source: "softone" },
    { code: "17", name: "ΚΑΡΠΑΤΣΙΟ ΜΕΡΙΔΑ", price: 16.0, category_id: catMap["Ορεκτικά"], vat_rate: 13, station: "cold", sort_order: 5, source: "softone" },
    { code: "19", name: "ΑΧΙΝΟΣΑΛΑΤΑ", price: 18.0, category_id: catMap["Ορεκτικά"], vat_rate: 13, station: "cold", sort_order: 6, source: "softone" },
    { code: "24", name: "ΑΥΓΟΤΑΡΑΧΟ ΜΕΡΙΔΑ", price: 22.0, category_id: catMap["Ορεκτικά"], vat_rate: 13, station: "cold", sort_order: 7, source: "softone" },
    { code: "25", name: "ΣΟΛΟΜΟΣ ΚΑΠΝΙΣΤΟΣ", price: 16.0, category_id: catMap["Ορεκτικά"], vat_rate: 13, station: "cold", sort_order: 8, source: "softone" },
    { code: "26", name: "ΠΡΑΣΙΝΗ ΣΑΛΑΤΑ", price: 10.0, category_id: catMap["Σαλάτες"], vat_rate: 13, station: "cold", sort_order: 1, source: "softone" },
    { code: "27", name: "ΜΕΛΙΤΖΑΝΟΣΑΛΑΤΑ", price: 9.0, category_id: catMap["Σαλάτες"], vat_rate: 13, station: "cold", sort_order: 2, source: "softone" },
    { code: "29", name: "ΧΩΡΙΑΤΙΚΗ ΣΑΛΑΤΑ", price: 12.0, category_id: catMap["Σαλάτες"], vat_rate: 13, station: "cold", sort_order: 3, source: "softone" },
    { code: "30", name: "ΑΓΓΟΥΡΟΝΤΟΜΑΤΑ", price: 8.0, category_id: catMap["Σαλάτες"], vat_rate: 13, station: "cold", sort_order: 4, source: "softone" },
    { code: "31", name: "ΣΑΛΑΤΑ ΒΡΑΣΤΑ", price: 10.0, category_id: catMap["Σαλάτες"], vat_rate: 13, station: "cold", sort_order: 5, source: "softone" },
    { code: "P01", name: "ΠΑΤΑΤΕΣ ΤΗΓΑΝΙΤΕΣ ΜΕΡΙΔΑ", price: 5.0, category_id: catMap["Τηγανητά"], vat_rate: 13, station: "hot", sort_order: 1, source: "softone" },
    { code: "F01", name: "ΦΑΓΚΡΙ ΚΙΛΟ", price: 78.0, category_id: catMap["Ψάρια Κιλό"], vat_rate: 13, station: "hot", sort_order: 1, source: "softone" },
    { code: "F02", name: "ΧΤΑΠΟΔΙ ΜΕΡΙΔΑ", price: 15.0, category_id: catMap["Ψάρια Μερίδα"], vat_rate: 13, station: "hot", sort_order: 1, source: "softone" },
    { code: "G01", name: "ΓΥΑΛΙΣΤΕΡΕΣ ΤΜΧ", price: 3.0, category_id: catMap["Ψάρια Μερίδα"], vat_rate: 13, station: "cold", sort_order: 2, source: "softone" },
    { code: "G02", name: "ΚΥΔΩΝΙΑ ΤΜΧ", price: 2.5, category_id: catMap["Ψάρια Μερίδα"], vat_rate: 13, station: "cold", sort_order: 3, source: "softone" },
    { code: "G03", name: "ΜΥΔΙΑ ΚΕΛΥΦΟΣ", price: 12.0, category_id: catMap["Ψάρια Μερίδα"], vat_rate: 13, station: "hot", sort_order: 4, source: "softone" },
    { code: "W01", name: "ΝΕΡΟ ACQUA PANNA", price: 4.0, category_id: catMap["Αναψυκτικά"], vat_rate: 24, station: "bar", sort_order: 1, source: "softone" },
    { code: "W02", name: "ΖΑΓΟΡΙ 1L", price: 2.5, category_id: catMap["Αναψυκτικά"], vat_rate: 24, station: "bar", sort_order: 2, source: "softone" },
    { code: "D01", name: "ΠΟΤΗΡΙ ΛΕΥΚΟ ΚΡΑΣΙ", price: 7.0, category_id: catMap["Λευκό Κρασί"], vat_rate: 24, station: "bar", sort_order: 1, source: "softone" },
  ];

  const prodResults = await sql`INSERT INTO products ${sql(products)} RETURNING id, name`;
  console.log("  Inserted", prodResults.length, "products");

  // Tables (20 tables in zone Κεντρική)
  console.log("Inserting tables...");
  const zoneId = zones[0].id;
  const tableData = [];
  for (let i = 1; i <= 20; i++) {
    tableData.push({
      number: i,
      capacity: i <= 10 ? 4 : 6,
      zone_id: zoneId,
      x: ((i - 1) % 5) * 150 + 50,
      y: Math.floor((i - 1) / 5) * 120 + 50,
      shape: "square",
      rotation: 0,
    });
  }

  const tableResults = await sql`INSERT INTO tables ${sql(tableData)} RETURNING id, number`;
  console.log("  Inserted", tableResults.length, "tables");

  // Loyalty settings
  await sql`
    INSERT INTO loyalty_settings (points_per_euro, points_for_reward, reward_value, stamps_for_free_item)
    VALUES (1, 100, 10, 10)
  `;
  console.log("  Inserted loyalty settings");

  // Summary
  console.log("\n=== REAL DATA SEED COMPLETE ===");
  console.log("Categories:", catResults.length);
  console.log("Zones:", zones.length);
  console.log("Staff:", staff.length);
  console.log("Products:", prodResults.length);
  console.log("Tables:", tableResults.length);

  await sql.end();
}

seedRealData().catch((e) => {
  console.error("ERROR:", e.message);
  process.exit(1);
});
