import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import { env } from "./env";

/**
 * Works with any managed Postgres. Supabase connection strings are detected
 * automatically (TLS on), and `DATABASE_SSL=false` keeps local Postgres usable.
 *
 * Supabase notes:
 * - Use the **session pooler** string (port 5432) for this long-lived pool.
 * - Use the **direct** connection string for `db:migrate` if the pooler
 *   rejects DDL.
 */
export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  application_name: "uniformity-api",
  max: env.isTest ? 4 : env.DATABASE_POOL_MAX,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
  keepAlive: true,
  // Managed providers present their own CA; strict verification can be enabled
  // with DATABASE_SSL_STRICT=true.
  ssl: env.databaseSsl
    ? { rejectUnauthorized: env.databaseSslStrict }
    : undefined,
});

pool.on("error", (error) => {
  // eslint-disable-next-line no-console
  console.error("Unexpected Postgres pool error", error);
});

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(
  handler: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await handler(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function closePool() {
  await pool.end();
}
