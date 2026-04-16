import { open } from "msnodesqlv8";
import postgres from "postgres";

const mssqlConn =
  "Driver={ODBC Driver 18 for SQL Server};Server=localhost\\SQLEXPRESS;Database=blacksea;Trusted_Connection=yes;TrustServerCertificate=yes;";

const pg = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" },
);

function queryMssql(conn, sql) {
  return new Promise((resolve, reject) => {
    conn.query(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function connectMssql() {
  return new Promise((resolve, reject) => {
    open(mssqlConn, (err, conn) => {
      if (err) reject(err);
      else resolve(conn);
    });
  });
}

async function migrateESTSales(conn) {
  console.log("\n=== ESTSalesTrans (POS Sales) ===");

  const rows = await queryMssql(
    conn,
    `SELECT ID, vDate, TableID, CustomerID, SalesManID,
            vTotal, vNET, vVAT, vPaid, Remarks
     FROM ESTSalesTrans
     ORDER BY ID`,
  );
  console.log(`  Read ${rows.length} records from SQL Server`);

  // Insert in batches
  const BATCH = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((r) => ({
      id: r.ID,
      sale_date: r.vDate || null,
      table_id: r.TableID || null,
      customer_id: r.CustomerID || null,
      salesman_id: r.SalesManID || null,
      total: parseFloat(r.vTotal) || 0,
      net: parseFloat(r.vNET) || 0,
      vat: parseFloat(r.vVAT) || 0,
      paid: parseFloat(r.vPaid) || 0,
      remarks: r.Remarks || null,
    }));

    try {
      await pg`INSERT INTO archive.softone_est_sales ${pg(batch)}`;
      inserted += batch.length;
      if (inserted % 5000 === 0 || i + BATCH >= rows.length) {
        console.log(`  Inserted ${inserted}/${rows.length}`);
      }
    } catch (e) {
      console.error(`  Batch error at ${i}: ${e.message.substring(0, 100)}`);
      // Try one by one
      for (const rec of batch) {
        try {
          await pg`INSERT INTO archive.softone_est_sales ${pg(rec)}`;
          inserted++;
        } catch (e2) {
          // skip
        }
      }
    }
  }
  console.log(`  Done: ${inserted} sales imported`);
}

async function migrateESTProductTrans(conn) {
  console.log("\n=== ESTProductTrans (POS Product Lines) ===");
  console.log("  This is 1.2M records, will take a few minutes...");

  // Read in chunks of 100K to avoid memory issues
  const countResult = await queryMssql(
    conn,
    "SELECT COUNT(*) as c FROM ESTProductTrans",
  );
  const total = countResult[0].c;
  console.log(`  Total records: ${total}`);

  const CHUNK = 50000;
  let offset = 0;
  let inserted = 0;

  while (offset < total) {
    const rows = await queryMssql(
      conn,
      `SELECT ID, SalesTransID, ProductID, pDesc, Qty,
              UnitPriceVat, TotalPrice, TotalNet, TotalVat, Remarks
       FROM ESTProductTrans
       ORDER BY ID
       OFFSET ${offset} ROWS FETCH NEXT ${CHUNK} ROWS ONLY`,
    );

    if (rows.length === 0) break;

    // Insert in sub-batches
    const BATCH = 500;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH).map((r) => ({
        id: r.ID,
        sales_trans_id: r.SalesTransID || null,
        product_id: r.ProductID || null,
        product_name: (r.pDesc || "").substring(0, 500),
        quantity: parseFloat(r.Qty) || 0,
        unit_price: parseFloat(r.UnitPriceVat) || 0,
        total_price: parseFloat(r.TotalPrice) || 0,
        total_net: parseFloat(r.TotalNet) || 0,
        total_vat: parseFloat(r.TotalVat) || 0,
        remarks: r.Remarks || null,
      }));

      try {
        await pg`INSERT INTO archive.softone_est_product_trans ${pg(batch)}`;
        inserted += batch.length;
      } catch (e) {
        // Skip failed batches for speed
        console.error(`  Batch error: ${e.message.substring(0, 80)}`);
      }
    }

    offset += rows.length;
    console.log(`  Progress: ${inserted}/${total}`);
  }

  console.log(`  Done: ${inserted} product lines imported`);
}

async function migrateInvoices(conn) {
  console.log("\n=== CustomerSalesTrans (Invoices) ===");

  const rows = await queryMssql(
    conn,
    `SELECT t.ID, t.Date, t.CustomerID, c.Ono as CustomerName,
            t.Remarks
     FROM CustomerSalesTrans t
     LEFT JOIN Customers c ON t.CustomerID = c.ID
     ORDER BY t.ID`,
  );
  console.log(`  Read ${rows.length} records`);

  const BATCH = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH).map((r) => ({
      id: r.ID,
      invoice_date: r.Date || null,
      customer_id: r.CustomerID || null,
      customer_name: (r.CustomerName || "").substring(0, 500),
      remarks: r.Remarks || null,
    }));

    try {
      await pg`INSERT INTO archive.softone_invoices ${pg(batch)}`;
      inserted += batch.length;
      if (inserted % 10000 === 0 || i + BATCH >= rows.length) {
        console.log(`  Inserted ${inserted}/${rows.length}`);
      }
    } catch (e) {
      for (const rec of batch) {
        try {
          await pg`INSERT INTO archive.softone_invoices ${pg(rec)}`;
          inserted++;
        } catch (e2) {
          // skip
        }
      }
    }
  }

  console.log(`  Done: ${inserted} invoices imported`);
}

async function main() {
  console.log("========================================");
  console.log("  Archive Migration: SoftOne → EatFlow");
  console.log("========================================");

  console.log("Connecting to SQL Server...");
  const conn = await connectMssql();
  console.log("Connected!");

  // Clear existing archive data
  console.log("\nClearing existing archive data...");
  await pg`DELETE FROM archive.softone_est_product_trans`;
  await pg`DELETE FROM archive.softone_est_sales`;
  await pg`DELETE FROM archive.softone_invoices`;
  console.log("Cleared.");

  await migrateESTSales(conn);
  await migrateESTProductTrans(conn);
  await migrateInvoices(conn);

  // Final counts
  console.log("\n========================================");
  console.log("  ARCHIVE FINAL COUNTS");
  console.log("========================================");
  const counts = await pg`
    SELECT 'softone_est_sales' as tbl, COUNT(*) as c FROM archive.softone_est_sales UNION ALL
    SELECT 'softone_est_product_trans', COUNT(*) FROM archive.softone_est_product_trans UNION ALL
    SELECT 'softone_invoices', COUNT(*) FROM archive.softone_invoices
  `;
  counts.forEach((r) => console.log(`  ${r.tbl}: ${r.c}`));

  conn.close(() => {});
  await pg.end();
}

main().catch((e) => {
  console.error("FATAL:", e.message);
  process.exit(1);
});
