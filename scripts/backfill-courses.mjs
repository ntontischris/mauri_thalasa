import postgres from "postgres";

const sql = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" },
);

async function main() {
  console.log("--- Before ---");
  const before = await sql`
    SELECT c.name AS category, co.name AS course
    FROM categories c
    LEFT JOIN courses co ON c.course_id = co.id
    ORDER BY c.name
  `;
  console.table(before);

  console.log("\n--- Checking default_course column ---");
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'categories' AND column_name = 'default_course'
  `;
  const hasDefaultCourse = cols.length > 0;
  console.log("default_course column exists?", hasDefaultCourse);

  if (hasDefaultCourse) {
    console.log("\n--- Backfilling via default_course ---");
    const res = await sql`
      UPDATE categories c
      SET course_id = co.id
      FROM courses co
      WHERE c.course_id IS NULL
        AND c.default_course = co.sort_order
    `;
    console.log("Rows updated:", res.count);

    console.log("\n--- Dropping obsolete default_course column ---");
    await sql`ALTER TABLE categories DROP COLUMN IF EXISTS default_course`;
    console.log("Dropped.");
  }

  // Fallback heuristic: any leftover unassigned → name-pattern match
  console.log("\n--- Heuristic fallback for any remaining NULL course_id ---");
  await sql`
    UPDATE categories c
    SET course_id = (SELECT id FROM courses WHERE name = 'Επιδόρπια')
    WHERE c.course_id IS NULL
      AND c.name ~* '(ΕΠΙΔΟΡΠ|ΓΛΥΚ|ΦΡΟΥΤ|ΠΑΓΩΤ|ΚΑΦΕ|ΡΟΦΗΜ|ΤΣΑΪ|ΤΣΑΙ)'
  `;
  await sql`
    UPDATE categories c
    SET course_id = (SELECT id FROM courses WHERE name = 'Κυρίως')
    WHERE c.course_id IS NULL
      AND c.name ~* '(ΨΑΡΙ|ΚΡΕΑΣ|ΚΡΕΑΤ|ΚΥΡΙΩΣ|ΜΑΚΑΡΟΝ|ΝΗΣΤΙΣΙΜ|ΜΕΡΙΔΑ|ΚΙΛΟ|ΚΟΤΟΠΟΥΛ|ΜΟΣΧΑΡ|ΛΟΥΚΑΝΙΚ|ΜΠΙΦΤΕΚΙ|ΧΟΙΡΙΝ|ΑΡΝΙ|ΘΑΛΑΣΣΙΝ|ΜΑΓΕΙΡΕΥΤ|ΠΑΣΤΑ|ΡΙΖΟΤΟ|ΤΗΓΑΝΗΤ)'
  `;
  await sql`
    UPDATE categories
    SET course_id = (SELECT id FROM courses WHERE name = 'Ορεκτικά & Ποτά')
    WHERE course_id IS NULL
  `;

  console.log("\n--- Reload PostgREST schema cache ---");
  await sql`NOTIFY pgrst, 'reload schema'`;

  console.log("\n--- After ---");
  const after = await sql`
    SELECT c.name AS category, co.name AS course, co.sort_order
    FROM categories c
    LEFT JOIN courses co ON c.course_id = co.id
    ORDER BY co.sort_order NULLS LAST, c.name
  `;
  console.table(after);

  const unassigned = after.filter((r) => !r.course);
  console.log(
    unassigned.length === 0
      ? "\n✅ All categories assigned to a course."
      : `\n⚠️ ${unassigned.length} categories still unassigned.`,
  );

  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
