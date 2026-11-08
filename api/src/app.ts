import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { localUploadsDir } from "./config/cloudinary";
import { logger } from "./config/logger";
import { query } from "./config/db";
import { adminRouter } from "./modules/admin/admin.routes";
import { authRouter } from "./modules/auth/auth.routes";
import { commentsRouter } from "./modules/comments/comments.routes";
import { listingsRouter } from "./modules/listings/listings.routes";
import { notificationsRouter } from "./modules/notifications/notifications.routes";
import { pushConfigured } from "./modules/notifications/push.service";
import { profileRouter } from "./modules/profile/profile.routes";
import { sellersRouter } from "./modules/sellers/sellers.routes";
import { uploadsRouter } from "./modules/uploads/uploads.routes";
import { wishlistRouter } from "./modules/wishlist/wishlist.routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

function allowedOrigins() {
  return env.WEB_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: false,
    }),
  );

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins().includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error("Origin not allowed"));
      },
      credentials: true,
    }),
  );

  app.use(express.json({ limit: "1mb" }));
  app.use(cookieParser());

  if (!env.isTest) {
    app.use(
      pinoHttp({
        logger,
        autoLogging: {
          ignore: (req) => req.url === "/health" || req.url === "/api/health",
        },
      }),
    );
  }

  const health = async (_req: Request, res: Response) => {
    try {
      await query("SELECT 1");
      res.json({
        status: "ok",
        db: "up",
        push: pushConfigured,
        uptimeSeconds: Math.round(process.uptime()),
        version: process.env.npm_package_version ?? "1.0.0",
      });
    } catch {
      res.status(503).json({ status: "degraded", db: "down" });
    }
  };

  app.get("/health", health);
  app.get("/api/health", health);

  // Development-only local driver also serves files from the API; production
  // uploads go to Cloudinary. Serving read-only keeps imported photos working
  // regardless of which driver is active.
  app.use(
    "/uploads",
    express.static(localUploadsDir(), {
      fallthrough: true,
      maxAge: "1d",
      index: false,
    }),
  );

  app.get("/", (_req, res) => {
    res.json({
      name: "Uniformity API",
      version: "v1",
      docs: "/api/health",
    });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/listings", listingsRouter);
  app.use("/api/sellers", sellersRouter);
  app.use("/api/comments", commentsRouter);
  app.use("/api/wishlist", wishlistRouter);
  app.use("/api/notifications", notificationsRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api/admin", adminRouter);

  app.use(notFoundHandler);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
    errorHandler(error, req, res, next);
  });

  return app;
}
