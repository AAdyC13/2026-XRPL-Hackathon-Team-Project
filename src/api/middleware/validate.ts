import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../../infrastructure/errors.js";

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      next(new AppError(400, "VALIDATION_ERROR", "Invalid request body.", result.error.flatten()));
      return;
    }

    req.body = result.data;
    next();
  };
}
