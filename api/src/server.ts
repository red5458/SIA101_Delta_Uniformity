import { createApp } from "./app";
import { env } from "./config/env";
import { logger } from "./config/logger";
import { closePool } from "./config/db";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(
    {
      port: env.PORT,
      env: env.NODE_ENV,
      database: env.databaseHost,
      provider: env.databaseProvider,
      databaseTls: env.databaseSsl,
      emailMode: env.EMAIL_MODE,
      uploadDriver: env.uploadDriver,
    },
    `Uniformity API listening on http://localhost:${env.PORT}`,
  );
});

async function shutdown(signal: string) {
  logger.info({ signal }, "Shutting down");
  server.close(async () => {
    await closePool().catch(() => undefined);
    process.exit(0);
  });

  // Do not hang forever on keep-alive connections.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
