import fs from "node:fs";
import path from "node:path";
import { closePool, query, withTransaction } from "../config/db";
import { env } from "../config/env";
import { printDatabaseError } from "../utils/dbErrors";

function migrationsDir() {
  const candidates = [
    path.resolve(process.cwd(), "migrations"),
    path.resolve(process.cwd(), "api/migrations"),
  ];
  const found = candidates.find((dir) => fs.existsSync(dir));
  if (!found) throw new Error("Could not find the migrations directory.");
  return found;
}

async function main() {
  const dir = migrationsDir();

  // eslint-disable-next-line no-console
  console.log(
    `Applying migrations to ${env.databaseHost} (${env.databaseProvider}, TLS ${
      env.databaseSsl ? "on" : "off"
    })`,
  );

  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `);

  const applied = new Set(
    (await query<{ name: string }>(`SELECT name FROM schema_migrations`)).rows.map(
      (row) => row.name,
    ),
  );

  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      // eslint-disable-next-line no-console
      console.log(`skip  ${file}`);
      continue;
    }

    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    // eslint-disable-next-line no-console
    console.log(`apply ${file}`);

    // One dedicated client keeps BEGIN/COMMIT on the same connection even when
    // the provider uses a transaction pooler.
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [
        file,
      ]);
    });
  }

  // eslint-disable-next-line no-console
  console.log("Migrations complete.");
}

main()
  .catch((error) => {
    printDatabaseError("Migration failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
