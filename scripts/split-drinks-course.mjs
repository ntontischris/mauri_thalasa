import postgres from "postgres";

const sql = postgres(
  "postgresql://postgres.hwsyhcakhdrbqcckpwpx:dnSzPHsUsIceSNEQ@aws-1-eu-west-3.pooler.supabase.com:5432/postgres",
  { ssl: "require" },
);

const DRINK_PATTERN =
  "(ΚΡΑΣΙ|ΜΠΥΡ|ΟΥΖΟ|ΟΥΖΑ|ΤΣΙΠΟΥΡ|ΠΟΤΟ|ΠΟΤΑ|ΑΝΑΨΥΚΤ|ΣΑΜΠΑΝ|ΡΟΦΗΜ|ΤΣΑΪ|ΤΣΑΙ|ΚΑΦΕ|ΧΥΜΟ|ΝΕΡΟ)";

async function main() {
  // 1) Rename "Ορεκτικά & Ποτά" → "Ορεκτικά"
  await sql`
    UPDATE courses SET name = 'Ορεκτικά', color = '#22c55e'
    WHERE name = 'Ορεκτικά & Ποτά'
  `;
  console.log("Renamed Ορεκτικά & Ποτά → Ορεκτικά");

  // 2) Create "Ποτά" course if missing, sort_order between Ορεκτικά (1) and Κυρίως
  const [orektika] = await sql`SELECT id, sort_order FROM courses WHERE name = 'Ορεκτικά'`;
  const [kurios] = await sql`SELECT id, sort_order FROM courses WHERE name = 'Κυρίως'`;
  const [epidorpia] = await sql`SELECT id, sort_order FROM courses WHERE name = 'Επιδόρπια'`;

  // Shift Κυρίως and Επιδόρπια to make room for Ποτά at sort_order=2
  if (kurios) {
    await sql`UPDATE courses SET sort_order = 3 WHERE id = ${kurios.id}`;
  }
  if (epidorpia) {
    await sql`UPDATE courses SET sort_order = 4 WHERE id = ${epidorpia.id}`;
  }

  let [pota] = await sql`SELECT id FROM courses WHERE name = 'Ποτά'`;
  if (!pota) {
    [pota] = await sql`
      INSERT INTO courses (name, sort_order, color)
      VALUES ('Ποτά', 2, '#f59e0b')
      RETURNING id
    `;
    console.log("Created Ποτά course (sort_order=2)");
  } else {
    await sql`UPDATE courses SET sort_order = 2, color = '#f59e0b' WHERE id = ${pota.id}`;
    console.log("Updated existing Ποτά course to sort_order=2");
  }

  // 3) Move all drink-like categories to Ποτά (keep ΚΑΦΕΣ in Επιδόρπια — end of meal)
  const movedResult = await sql`
    UPDATE categories
    SET course_id = ${pota.id}
    WHERE name ~* ${"(ΚΡΑΣΙ|ΜΠΥΡ|ΟΥΖΟ|ΟΥΖΑ|ΤΣΙΠΟΥΡ|ΠΟΤΟ|ΠΟΤΑ|ΑΝΑΨΥΚΤ|ΣΑΜΠΑΝ|ΧΥΜΟ|ΝΕΡΟ)"}
  `;
  console.log(`Moved ${movedResult.count} categories to Ποτά`);

  // 4) Reload schema cache
  await sql`NOTIFY pgrst, 'reload schema'`;

  // 5) Show final state
  console.log("\n--- Final state ---");
  const state = await sql`
    SELECT co.name AS course, co.sort_order, c.name AS category
    FROM categories c
    JOIN courses co ON c.course_id = co.id
    ORDER BY co.sort_order, c.name
  `;
  console.table(state);

  const courses = await sql`SELECT name, sort_order, color FROM courses ORDER BY sort_order`;
  console.log("\nCourses:");
  console.table(courses);

  await sql.end();
}

main().catch(async (err) => {
  console.error(err);
  await sql.end();
  process.exit(1);
});
