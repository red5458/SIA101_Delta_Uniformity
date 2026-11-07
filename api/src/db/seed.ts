import { closePool, query } from "../config/db";

const CATEGORIES = [
  ["Standard Uniform", "standard-uniform", 1, "Daily uniform sets and pieces"],
  ["PE Uniform", "pe-uniform", 2, "Physical education uniforms"],
  ["Department Shirt", "department-shirt", 3, "College and program shirts"],
  [
    "Course Equipment",
    "course-equipment",
    4,
    "Calculators, breadboards, lab and engineering gear",
  ],
  ["Accessories", "accessories", 5, "IDs, lanyards, patches, and other add-ons"],
] as const;

async function main() {
  for (const [name, slug, order, description] of CATEGORIES) {
    await query(
      `INSERT INTO categories (name, slug, display_order, description)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE
         SET name = EXCLUDED.name,
             display_order = EXCLUDED.display_order,
             description = EXCLUDED.description`,
      [name, slug, order, description],
    );
  }

  const { rows } = await query<{ count: number }>(
    `SELECT count(*)::int AS count FROM categories`,
  );
  // eslint-disable-next-line no-console
  console.log(`Seed complete: ${rows[0]?.count ?? 0} categories.`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
