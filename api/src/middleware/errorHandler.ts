import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { logger } from "../config/logger";
import { ApiError } from "../utils/ApiError";
import { env } from "../config/env";

interface PgError extends Error {
  code?: string;
  constraint?: string;
}

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      message: `No route for ${req.method} ${req.originalUrl}`,
      code: "NOT_FOUND",
    },
  });
};

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (res.headersSent) return;

  if (error instanceof ZodError) {
    const first = error.issues[0];
    res.status(422).json({
      error: {
        message: first?.message ?? "Invalid input",
        code: "VALIDATION_ERROR",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof ApiError) {
    res.status(error.status).json({
      error: { message: error.message, code: error.code },
    });
    return;
  }

  if (error instanceof SyntaxError && "body" in error) {
    res.status(400).json({
      error: { message: "Malformed JSON body", code: "INVALID_JSON" },
    });
    return;
  }

  const pg = error as PgError;
  if (pg.code === "23505") {
    res.status(409).json({
      error: { message: "That record already exists.", code: "DUPLICATE" },
    });
    return;
  }
  if (pg.code === "23514") {
    res.status(422).json({
      error: { message: pg.message, code: "CONSTRAINT_VIOLATION" },
    });
    return;
  }
  if (pg.code === "22P02" || pg.code === "22007") {
    res.status(400).json({
      error: { message: "Invalid identifier or value.", code: "INVALID_INPUT" },
    });
    return;
  }
  if (pg.code === "23503") {
    res.status(400).json({
      error: { message: "Related record not found.", code: "REFERENCE_INVALID" },
    });
    return;
  }

  logger.error({ err: error, path: req.originalUrl, method: req.method }, "Unhandled error");
  res.status(500).json({
    error: {
      message: "Something went wrong on our side.",
      code: "INTERNAL_ERROR",
      ...(env.isProduction ? {} : { debug: (error as Error)?.message }),
    },
  });
};
