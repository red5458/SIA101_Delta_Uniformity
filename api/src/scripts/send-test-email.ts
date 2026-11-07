/**
 * Sends a real verification-style email through the configured provider.
 *
 *   npm run email:test -- you@bicol-u.edu.ph
 *
 * With EMAIL_MODE=gmail this exercises the OAuth2 refresh token and the Gmail
 * API end to end, which is exactly what the OTP flow uses.
 */
import { sendVerificationEmail, verifyEmailTransport } from "../config/mailer";
import { env } from "../config/env";

const to = process.argv[2]?.trim();

async function main() {
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    throw new Error(
      "Usage: npm run email:test -- you@bicol-u.edu.ph (or any inbox you can open)",
    );
  }

  // eslint-disable-next-line no-console
  console.log(`Mode:   ${env.EMAIL_MODE}`);
  // eslint-disable-next-line no-console
  console.log(`From:   ${env.MAIL_FROM}`);

  const transport = await verifyEmailTransport();
  // eslint-disable-next-line no-console
  console.log(`Transport OK: ${transport}`);

  // A fixed code is fine here: this is a delivery test, not a real account.
  await sendVerificationEmail(to, "123456");
  // eslint-disable-next-line no-console
  console.log(`Sent test email to ${to}. Check the inbox and spam folder.`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(
      `Email test failed: ${error instanceof Error ? error.message : error}`,
    );
    process.exitCode = 1;
  });
