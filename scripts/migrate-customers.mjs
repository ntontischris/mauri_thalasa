import { createReadStream } from "fs";
import { parse } from "csv-parse";
import postgres from "postgres";

const sql = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" },
);

const CSV_PATH = "C:/Users/ntont/Desktop/MAURI/export_customers.csv";

async function migrate() {
  console.log("Reading customers CSV...");

  const records = [];

  const parser = createReadStream(CSV_PATH).pipe(
    parse({ columns: true, skip_empty_lines: true, trim: true, bom: true }),
  );

  for await (const row of parser) {
    // Skip empty names
    const name = (row.Ono || "").trim();
    if (!name) continue;

    const afm = (row.AFM || "").trim() || null;
    const phone = (row.Tel_2 || row.Tel_1 || row.Mobil_2 || row.Mobil_1 || "").trim() || null;
    const phone2 = (row.Tel2_2 || row.Tel2_1 || "").trim() || null;
    const fax = (row.FAX_2 || row.FAX_1 || "").trim() || null;
    const email = (row.EMail || "").trim() || null;
    const address = (row.Address || "").trim();
    const area = (row.Area || "").trim();
    const town = (row.Town || "").trim();
    const zip = (row.TK || "").trim();
    const doy = (row.DOY || "").trim();
    const discount = parseFloat(row.Discount) || 0;
    const isActive = row.IsActive === "1" || row.IsActive === "" || !row.IsActive;
    const legacyId = parseInt(row.ID) || null;
    const remarks = (row.Remarks || "").trim() || null;
    const birthday = (row.BirthDay || "").trim() || null;
    const contactPerson = (row.ContactPerson || "").trim() || null;

    records.push({
      name,
      afm,
      phone,
      email,
      birthday: birthday && birthday !== "" && !birthday.startsWith("0000") ? birthday : null,
      notes: [remarks, contactPerson ? `Επαφή: ${contactPerson}` : null]
        .filter(Boolean)
        .join(" | ") || null,
      is_vip: false,
      allergies: [],
      tags: [],
      loyalty_points: 0,
      stamp_count: 0,
      address: {
        street: address || undefined,
        area: area || undefined,
        city: town || undefined,
        zip: zip || undefined,
      },
      contact: {
        phone2: phone2 || undefined,
        fax: fax || undefined,
      },
      billing: {
        doy: doy || undefined,
      },
      is_active: isActive,
      discount,
      legacy_id: legacyId,
      source: "softone",
      metadata: {
        softone_code: (row.Code || "").trim() || undefined,
        softone_type_id: parseInt(row.CustomerTypeID) || undefined,
      },
    });
  }

  console.log(`Parsed ${records.length} customers from CSV`);

  // Check for duplicate AFMs (keep first occurrence)
  const seenAfm = new Set();
  const uniqueRecords = [];
  let dupeCount = 0;

  for (const rec of records) {
    if (rec.afm && seenAfm.has(rec.afm)) {
      dupeCount++;
      rec.afm = null; // Clear duplicate AFM
    }
    if (rec.afm) seenAfm.add(rec.afm);
    uniqueRecords.push(rec);
  }

  if (dupeCount > 0) {
    console.log(`  Cleared ${dupeCount} duplicate AFMs`);
  }

  // Insert in batches of 500
  const BATCH = 500;
  let inserted = 0;

  for (let i = 0; i < uniqueRecords.length; i += BATCH) {
    const batch = uniqueRecords.slice(i, i + BATCH);
    try {
      await sql`INSERT INTO customers ${sql(batch)}`;
      inserted += batch.length;
      console.log(`  Inserted ${inserted}/${uniqueRecords.length}`);
    } catch (e) {
      console.error(`  Batch ${i}-${i + BATCH} failed:`, e.message);
      // Try one by one
      for (const rec of batch) {
        try {
          await sql`INSERT INTO customers ${sql(rec)}`;
          inserted++;
        } catch (e2) {
          console.error(`  Skipped "${rec.name}": ${e2.message}`);
        }
      }
      console.log(`  Progress: ${inserted}/${uniqueRecords.length}`);
    }
  }

  // Verify
  const count = await sql`SELECT COUNT(*) as c FROM customers`;
  console.log(`\n=== DONE ===`);
  console.log(`Customers in DB: ${count[0].c}`);

  await sql.end();
}

migrate().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
