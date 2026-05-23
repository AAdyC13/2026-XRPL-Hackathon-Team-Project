import { NextFunction, Request, RequestHandler, Response } from "express";
import { createSignRequest } from "../../services/xaman.service.js";

export function asyncHandler(handler: (req: Request, res: Response, next: NextFunction) => Promise<void>): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}

export async function maybeCreateXamanPayload(txjson: unknown, signWithXaman?: boolean, userToken?: string) {
  if (!signWithXaman) {
    return { txjson };
  }

  const xaman = await createSignRequest({ txjson, userToken });
  return {
    txjson,
    xaman
  };
}
