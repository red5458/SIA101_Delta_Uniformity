import type { NextFunction, Request, RequestHandler, Response } from "express";

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({ data });
}

export function fail(
  res: Response,
  message: string,
  status = 400,
  code?: string,
) {
  return res.status(status).json({ error: { message, code } });
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
