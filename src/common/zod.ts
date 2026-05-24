import { BadRequestException } from "@nestjs/common";
import { z } from "zod";

export function parseBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new BadRequestException({
      code: "INVALID_PARAMS",
      message: "Invalid request body.",
      details: parsed.error.flatten()
    });
  }

  return parsed.data;
}
