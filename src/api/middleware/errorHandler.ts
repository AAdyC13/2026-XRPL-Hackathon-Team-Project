import { NextFunction, Request, Response } from "express";
import { toAppError } from "../../infrastructure/errors.js";
import { ApiFailure } from "../../types/api.js";

export function errorHandler(error: unknown, _req: Request, res: Response<ApiFailure>, _next: NextFunction) {
  const appError = toAppError(error);

  res.status(appError.statusCode).json({
    ok: false,
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details
    }
  });
}
