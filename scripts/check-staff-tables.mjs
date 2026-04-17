import postgres from "postgres";

const sql = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" },
);

const tables = await sql`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('staff', 'staff_members')
`;
console.log("Tables present:", tables.map((t) => t.table_name));

for (const t of tables) {
  const count = await sql`SELECT COUNT(*) AS c FROM ${sql(t.table_name)}`;
  console.log(`${t.table_name}: ${count[0].c} rows`);
}

if (tables.some((t) => t.table_name === "staff")) {
  const rows = await sql`SELECT id, name, role FROM staff LIMIT 10`;
  console.log("staff sample:");
  console.table(rows);
}
if (tables.some((t) => t.table_name === "staff_members")) {
  const rows = await sql`SELECT id, name, role FROM staff_members LIMIT 10`;
  console.log("staff_members sample:");
  console.table(rows);
}

await sql.end();
