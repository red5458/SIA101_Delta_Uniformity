/**
 * Creates (or repairs) the first administrator account.
 *
 *   npm run bootstrap-admin
 *
 * Reads ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME from the environment.
 */
import { closePool, query } from "../config/db";
import { env } from "../config/env";
import { hashPassword } from "../utils/password";
import type { UserRow } from "../types";

const email = (process.env.ADMIN_EMAIL ?? "admin@bicol-u.edu.ph").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
const name = process.env.ADMIN_NAME ?? "Uniformity Admin";

async function main() {
  if (!/^[A-Za-z0-9._%+\-]+@bicol-u\.edu\.ph$/.test(email)) {
    throw new Error("ADMIN_EMAIL must be a @bicol-u.edu.ph address.");
  }
  if (password.length < 8) {
    throw new Error("ADMIN_PASSWORD must be at least 8 characters.");
  }
  if (
    env.isProduction &&
    ["UniformityAdmin2026!", "change-this-before-deploying"].includes(password)
  ) {
    throw new Error("Refusing to use a default admin password in production.");
  }

  const passwordHash = await hashPassword(password);

  const { rows: existing } = await query<UserRow>(
    `SELECT * FROM users WHERE lower(email) = lower($1)`,
    [email],
  );

  if (existing[0]) {
    await query(
      `UPDATE users
          SET password_hash = $2,
              name = $3,
              is_admin = true,
              is_verified = true,
              is_suspended = false,
              year_level = COALESCE(year_level, '4th year'),
              department = COALESCE(department, 'CSD'),
              program = COALESCE(program, 'BSIT'),
              contact_email = COALESCE(contact_email, email)
        WHERE user_id = $1`,
      [existing[0].user_id, passwordHash, name],
    );

    // eslint-disable-next-line no-console
    console.log(`Updated administrator ${email}.`);
  } else {
    await query(
      `INSERT INTO users
         (email, password_hash, name, year_level, department, program,
          is_verified, is_admin, contact_email)
       VALUES ($1, $2, $3, '4th year', 'CSD', 'BSIT', true, true, $1)`,
      [email, passwordHash, name],
    );

    // eslint-disable-next-line no-console
    console.log(`Created administrator ${email}.`);
  }

  // eslint-disable-next-line no-console
  console.log("Remember to rotate this password before deploying.");
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Bootstrap failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
