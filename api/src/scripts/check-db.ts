/**
 * Connection diagnostic for the configured Postgres database.
 *
 *   npm run db:check
 *
 * Prints the provider, host, TLS mode, server version, and whether the
 * Uniformity tables and migrations are present. Never prints the password.
 */
import { closePool, query } from "../config/db";
import { env } from "../config/env";
import { printDatabaseError } from "../utils/dbErrors";

interface ServerInfo {
  version: string;
  database: string;
  user: string;
}

async function main() {
  const started = Date.now();

  const { rows: infoRows } = await query<ServerInfo>(
    `SELECT version() AS version,
            current_database() AS database,
            current_user AS "user"`,
  );
  const info = infoRows[0]!;

  const { rows: tableRows } = await query<{ count: number }>(
    `SELECT count(*)::int AS count
       FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );

  const migrations = await query<{ name: string; applied_at: Date }>(
    `SELECT name, applied_at FROM schema_migrations ORDER BY name`,
  ).catch(() => null);

  const counts = await query<{
    users: number;
    listings: number;
    categories: number;
  }>(
    `SELECT
       (SELECT count(*)::int FROM users) AS users,
       (SELECT count(*)::int FROM listings) AS listings,
       (SELECT count(*)::int FROM categories) AS categories`,
  ).catch(() => null);

  // eslint-disable-next-line no-console
  console.log(
    [
      "Connected.",
      `  provider    ${env.databaseProvider}`,
      `  host        ${env.databaseHost}`,
      `  database    ${info.database}`,
      `  user        ${info.user}`,
      `  tls         ${env.databaseSsl ? (env.databaseSslStrict ? "on (strict)" : "on") : "off"}`,
      `  server      ${info.version.split(",")[0]}`,
      `  tables      ${tableRows[0]?.count ?? 0} in public`,
      `  migrations  ${
        migrations
          ? migrations.rows.map((row) => row.name).join(", ") || "none applied"
          : "schema_migrations missing"
      }`,
      counts
        ? `  rows        users=${counts.rows[0]?.users} listings=${counts.rows[0]?.listings} categories=${counts.rows[0]?.categories}`
        : "  rows        (tables not created yet)",
      `  latency     ${Date.now() - started} ms`,
    ].join("\n"),
  );
}

main()
  .catch((error) => {
    printDatabaseError("Database check failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
