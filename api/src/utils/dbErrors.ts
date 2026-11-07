/**
 * Turns low-level pg/node connection errors into actionable advice. Shared by
 * the API startup path and by the db:check / db:migrate scripts.
 */
export function databaseHint(error: unknown): string | null {
  const message = error instanceof Error ? error.message : String(error);

  if (/ECONNREFUSED|ETIMEDOUT|ENETUNREACH|EHOSTUNREACH/.test(message)) {
    return [
      "The database is unreachable from this machine.",
      "- Supabase: copy the connection string from Project Settings → Database.",
      "  The direct `db.<ref>.supabase.co` host is IPv6-only on the free plan;",
      "  use the Session pooler string (`...pooler.supabase.com:5432`).",
    ].join("\n");
  }
  if (/password authentication failed|role .* does not exist/i.test(message)) {
    return [
      "The database rejected the credentials.",
      "- Copy the password exactly and URL-encode special characters:",
      "  @ -> %40, : -> %3A, / -> %2F, # -> %23, ? -> %3F.",
      "- For Supabase, the role is usually `postgres.<project-ref>`.",
    ].join("\n");
  }
  if (
    /self.signed certificate|unable to verify the first certificate|CERT_/i.test(
      message,
    )
  ) {
    return [
      "The TLS certificate could not be verified.",
      "- Leave DATABASE_SSL_STRICT unset (false) for Supabase, or remove",
      "  `sslmode=verify-full` from DATABASE_URL.",
    ].join("\n");
  }
  if (/ENOTFOUND|getaddrinfo/i.test(message)) {
    return "Host not found. Check the project reference and region in DATABASE_URL.";
  }
  if (/prepared statement/i.test(message)) {
    return [
      "This looks like the transaction pooler rejecting prepared statements.",
      "Use the Session pooler (port 5432) or direct connection string for migrations.",
    ].join("\n");
  }
  if (/permission denied/i.test(message)) {
    return "The database role cannot run this statement. Use the owning role (e.g. `postgres` on Supabase).";
  }
  if (/no pg_hba.conf entry|SSL required|does not support SSL/i.test(message)) {
    return "Set DATABASE_SSL to `true` (managed providers) or `false` (local Postgres).";
  }

  return null;
}

export function printDatabaseError(prefix: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  // eslint-disable-next-line no-console
  console.error(`${prefix}: ${message}`);

  const hint = databaseHint(error);
  if (hint) {
    // eslint-disable-next-line no-console
    console.error(`\n${hint}`);
  }
}
