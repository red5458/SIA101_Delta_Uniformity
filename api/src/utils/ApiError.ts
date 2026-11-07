export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const badRequest = (message: string, code = "BAD_REQUEST") =>
  new ApiError(400, message, code);

export const unauthorized = (message = "Sign in required", code = "UNAUTHORIZED") =>
  new ApiError(401, message, code);

export const forbidden = (message = "You cannot do that.", code = "FORBIDDEN") =>
  new ApiError(403, message, code);

export const notFound = (message = "Not found", code = "NOT_FOUND") =>
  new ApiError(404, message, code);

export const conflict = (message: string, code = "CONFLICT") =>
  new ApiError(409, message, code);
